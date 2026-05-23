# API design

This document captures the ideal API contract for the battle engine, assuming full ownership of the frontend. It identifies what the current public API (`/battles`, `/battles/simulate`) gets right, what it gets wrong, and what the target shape should look like.

The legacy `/api/calculate` endpoint exists purely to serve bbr40.com. If that dependency is removed, it goes with it. Everything here is about the native API only.

---

## Design principles

1. **Express intent, not implementation.** The frontend should never need to know internal engine concepts like unit IDs (`Submarine_0`), counter resets, or step sequencing.
2. **Damage state is first-class.** A surviving damaged battleship is not the same as a healthy one. It should never be collapsed to `{ Battleship: 1 }`.
3. **Reproducibility is explicit.** The seed used is always returned in responses, even when auto-generated. This makes any outcome replayable.
4. **Symmetry between request and response.** If you can send damage state in (for campaigns), you get it back out.
5. **Semantic naming over positional encoding.** Tech is a named set, not an integer. Unit types are strings, not derived compound names.

---

## What the current API gets right

- **Named tech IDs** (`SuperBattleships`, not `5`). The new engine's `TechId` set is the correct model. Multiple techs per side.
- **Unit counts by canonical type** (`{ Battleship: 1 }`, not `SuperBattleship`). No conflation of damage state or tech into the unit name.
- **Seeded RNG.** `seed` is accepted on both endpoints; deterministic replay works.
- **`orderOfLoss` override.** Clients can supply a custom casualty priority per side.
- **Event log as the audit trail.** `POST /battles` returns the full event sequence.

---

## Problems with the current API

### 1. Survivors lose damage state

`toUnitCountMap` in `simulation.ts` groups by `unit.type` only, discarding `hpTaken`. A damaged battleship (`hpTaken: 1`) and a healthy one both serialize to `{ Battleship: 1 }`. This is wrong for two reasons:

- **IPC calculation is misleading.** A damaged capital ship that survives is treated as a full unit. The response says 0 IPC lost, but the player is left with a half-strength ship.
- **Campaigns break.** When survivors carry into the next battle, their damage state must transfer. The engine (`runCampaign`) supports this — the API discards it before the caller can use it.
- **Simulation outcome distributions are wrong.** Two iterations that end with "1 damaged battleship" vs "1 healthy battleship" hash to the same key. They should be distinct outcomes.

**Fix:** survivors are always `Array<{ type, hpTaken, count }>`, never a flat type-count map.

### 2. Target assignments require internal unit IDs

`subTargetAssignments` and `tacTargetAssignments` are `Record<string, string>` maps of unit ID → unit ID (e.g., `{ Submarine_0: 'Destroyer_3' }`). The frontend has no way to know these IDs except by relying on the counter-reset convention inside `buildBattleState`. This is a leaky internal implementation detail surfaced as a public contract.

**Fix:** target assignments are type-level priority declarations, not unit-ID maps. See the target assignments section below.

### 3. `bombardingUnits` is not in the schema

`buildBattleState` accepts `bombardingUnits` for amphibious assaults, but `SideInputSchema` in `schemas.ts` never exposes it. Shore bombardment is inaccessible through the public API (only through the legacy adapter). There is also no `isAmphibious` flag to contextualize the assault.

**Fix:** add `bombardingUnits` to `SideInputSchema` and `isAmphibious` to `BattleRequestSchema`.

### 4. `events` typed as `unknown[]`

`BattleResponse.events` is typed `unknown[]` even though the engine produces a fully-typed `Event[]`. This is a pure oversight — the type exists and should be used.

**Fix:** type it as `Event[]`.

### 5. Seed not returned in responses

The seed used for a battle is not echoed back. If the caller omits a seed (auto-generated), there is no way to replay the exact battle.

**Fix:** always include `seed` in responses.

### 6. No campaign endpoint

`runCampaign` exists in the engine but is not exposed. Sequential battles — where survivors of battle N fight in battle N+1 — are a core use case.

**Fix:** add `POST /campaigns`.

### 7. `stalemates` counter is always 0

In `legacyAdapter.ts`, `stalemates` is declared and reported but never incremented. This is a bug in the legacy path; the native simulation also has no stalemate tracking.

---

## Ideal schemas

### Unit representation

```typescript
// Input: simple form for normal use
type UnitInput = Record<UnitType, number>;

// Input: explicit form when entering with pre-damaged units (campaigns, custom setups)
type UnitInputDetailed = Array<{ type: UnitType; count: number; hpTaken?: number }>;

// Output: always explicit — damage state is never dropped
type SurvivingUnits = Array<{ type: UnitType; count: number; hpTaken: number }>;
```

### Side input

```typescript
interface SideInput {
  tech: TechId[];
  units: UnitInput | UnitInputDetailed;
  bombardingUnits?: UnitInput;          // amphibious only; these units fire round 1 and are immune to casualties
  orderOfLoss?: UnitType[];             // casualty priority override; transports always appended last
  subTargets?: UnitType[];              // priority list for attacking sub Target Select (see below)
  tacTargets?: UnitType[];              // priority list for attacking tac bomber Target Select
}
```

### Battle request

```typescript
interface BattleRequest {
  terrain: 'land' | 'sea';
  isAmphibious?: boolean;               // enables shore bombardment; required if bombardingUnits is set
  attacker: SideInput;
  defender: SideInput;
  seed?: number;                        // omit for random; always returned in response
}
```

### Battle response

```typescript
interface BattleResponse {
  seed: number;
  outcome: 'attacker' | 'defender' | 'draw';
  rounds: number;
  survivors: {
    attacker: SurvivingUnits;
    defender: SurvivingUnits;
  };
  ipcAtRisk: { attacker: number; defender: number };   // total IPC committed at start
  ipcLost: { attacker: number; defender: number };     // IPC of destroyed units (not repair costs)
  events: Event[];
}
```

### Simulate request

```typescript
interface SimulateRequest extends Omit<BattleRequest, 'seed'> {
  nIterations?: number;   // default 20,000; max 100,000
  seed?: number;          // seeds iteration i as baseSeed + i; always returned
}
```

### Simulate response

```typescript
interface SimulateResponse {
  seed: number;
  nIterations: number;
  stats: {
    attackerWinRate: number;
    defenderWinRate: number;
    drawRate: number;
    avgRounds: number;
    avgIpcLost: { attacker: number; defender: number };
  };
  outcomeDistribution: {
    attacker: Array<{ survivors: SurvivingUnits; probability: number; avgIpcLost: number }>;
    defender: Array<{ survivors: SurvivingUnits; probability: number; avgIpcLost: number }>;
  };
}
```

Sorting: attacker outcomes sorted by `probability` descending (most likely first). This is more useful for a frontend than the legacy "worst outcome first" ordering, which front-loads the tail risk and buries the most probable outcome.

The `dead` field from the legacy response is omitted — it is always derivable as `initial - survivors` and duplicates data.

### Campaign request / response

```typescript
interface CampaignRequest {
  battles: BattleRequest[];   // each battle's attacker.units is overridden by survivors from the prior battle
  seed?: number;
}

interface CampaignResponse {
  seed: number;
  battles: BattleResponse[];
}
```

The engine already supports this via `runCampaign`. The API just needs a route and a thin adapter that passes the `BattleRequest[]` array in and maps the results out.

---

## Target assignments redesign

### Why unit IDs don't work

The current interface accepts maps like `{ Submarine_0: 'Destroyer_3' }`. This requires the caller to:

1. Know that unit IDs are generated as `{type}_{counter}` starting from 0.
2. Know that `buildBattleState` resets the counter per call.
3. Know the order units are iterated when building the state.

These are internal implementation details. They happen to be deterministic, but any refactor of the counter logic silently breaks callers.

### The ideal interface

```typescript
// Priority list: each sub picks the first type it can find among defenders.
// "Target destroyers first; if none, target cruisers; if none, use engine default."
subTargets?: UnitType[];

// Same for attacking tac bombers.
tacTargets?: UnitType[];
```

The engine resolves `subTargets` to actual unit assignments at step 2 internally, using the priority list to find the best available target of each requested type.

**Why a priority list beats a fixed type declaration:**

A single `target: 'Destroyer'` assignment breaks when no destroyer is present — the assignment becomes a wasted action. A priority list degrades gracefully: `['Destroyer', 'Cruiser', 'AircraftCarrier', 'Battleship']` means "target the most valuable warship you can find." This matches how a player actually thinks about target selection.

**Per-unit targeting for advanced cases:**

The 1% case where you need sub 1 to hit the battleship and sub 2 to hit the destroyer can be expressed as a type-keyed map if needed:

```typescript
// Optional advanced form — not needed for the first implementation
subTargetOverrides?: Partial<Record<UnitType, UnitType[]>>;  // per-firer-type priority
```

This is not necessary for v1. The single priority list covers real gameplay.

---

## Routes

```
POST /battles           — single deterministic battle
POST /battles/simulate  — Monte Carlo simulation
POST /campaigns         — sequential battles (survivors carry forward)
GET  /health
```

`POST /api/calculate` is removed when the legacy frontend dependency is dropped.

---

## What the legacy adapter handles that would go away

With this ideal API, the following legacy concerns become unnecessary:

| Legacy concern | Ideal API equivalent |
|---|---|
| Single-integer tech encoding (0–9) | Named `TechId[]` array |
| Derived unit names (`SuperBattleshipX`, `DamagedBattleship`) | `{ type: 'Battleship', hpTaken: 1 }` |
| `impliedTech` inference from unit name | Tech is explicit on the side; no inference needed |
| `SurpriseStrikeSubmarine` as a unit type | Surprise Strike is a dynamic engine behavior, not a unit variant |
| `TargetStrikeTacticalBomber` as a unit type | `tacTargets` declaration; `usedTargetSelect` is resolved at decision time |
| `AirTransport` → `StrategicBomber` approximation | Air transport is a reclassification mode; not a valid combat unit input |
| Global `_legacyCounter` (race condition under concurrency) | `buildBattleState` counter is already isolated per call; no global needed |
| HTTP 200 on errors | 422 for validation failures; 500 for engine errors |
| `stalemates` counter (always 0) | Resolved once draw/stalemate distinction is decided (see below) |
| `computeDeadUnits` diffing by legacy name (inaccurate for damaged capitals) | Dead = initial − survivors; no name-based diffing needed |

---

## Open questions

**Draw vs stalemate.** The current engine has one outcome: `draw` (both sides wiped). The legacy format distinguishes `Draw` from `Stalemate`. Under the rules, both sides wiped is the only "both lose" case — there is no classic stalemate. The `stalemates` counter should be removed rather than fixed.

**IPC loss for damaged survivors.** The `ipcLost` field counts destroyed units only. A surviving damaged battleship costs 0 in `ipcLost`, even though the player will need to spend IPCs to repair it. This is intentional — repair cost is a post-combat, map-layer concern the engine doesn't own. The `survivors` array exposes `hpTaken` so the frontend can compute repair cost if it wants to.

**`orderOfLoss` precision.** Currently a `UnitType[]`. This cannot distinguish between a healthy and damaged unit of the same type. The engine already applies a sensible tiebreak (prefer absorbing hits with more-damaged units of the same type). Per-unit ordering would require addressing by instance, which reintroduces the unit-ID problem. The `UnitType[]` form is sufficient for v1.
