# BBR Combat Simulator — Comprehensive Refactor Plan (TypeScript)

## Context

The codebase is a Monte Carlo combat simulator for a board game (BBR 40 / Axis & Allies variant). A frontend at bbr40.com hits the single POST `/api/calculate` endpoint, which runs 20,000 battle simulations and returns win rate distributions and IPC-loss statistics.

**Problem:** The existing Python implementation is ~50% correct rule-wise, architecturally fragile (mutable state, monolithic classes), and has zero auditability. Eight confirmed bugs, 15+ missing mechanics. The `docs/design/architecture.md` document describes exactly the right target architecture — it just was never built.

**Goal:** Complete ground-up TypeScript rewrite implementing the architecture described in `architecture.md`, with all rules from `docs/combat/reference.md`, full event-log auditability, strict typing throughout, and clean API semantics.

**Monorepo readiness:** The engine is kept completely decoupled from HTTP so that it can later be extracted into a shared `packages/engine` workspace that the frontend imports directly. No monorepo wiring is done now — just clean separation.

---

## Toolchain

| Concern | Choice | Reason |
|---|---|---|
| Language | TypeScript 5.x strict | Full type safety; shared types with frontend |
| Runtime | Node.js LTS | Standard; worker_threads available if perf needed |
| HTTP | Fastify v5 | Fast, TypeScript-native, schema-first |
| Validation | Zod v3 | Runtime validation + inferred TypeScript types |
| Testing | Vitest | Fast, TS-native, Jest-compatible API |
| Dev runner | tsx | Run TypeScript directly, no build step in dev |
| Type check | tsc --noEmit | Strict type checking in CI |
| Profiles | TypeScript const objects | Full type safety, no YAML parsing |
| RNG | Custom mulberry32 | Zero-dependency seeded PRNG, fast, well-tested |

---

## Strong opinions

1. **Rewrite, don't patch.** The Python architecture makes partial fixes fragile and hard to verify.
2. **Engine is a pure library.** `src/engine/` has zero Fastify/HTTP imports — it's a function that takes state, returns state + events. The API layer is a thin adapter.
3. **Readonly types are non-negotiable.** Use `Readonly<T>` and `readonly` arrays throughout. Spread for updates. No mutation.
4. **TypeScript const objects for profiles.** Adding a new tech or unit requires zero runtime parsing and gives full editor autocomplete.
5. **The event log is the product.** Every dice roll, casualty choice, pairing activation, and tech modifier emits a typed event. The audit trail comes straight out of the event stream.
6. **Tests assert on event shapes.** A test that only checks final state can pass with wrong internals.
7. **Seeded RNG is a first-class API parameter.** Identical seed + identical input = identical event log. Enables replay, debugging, regression testing.

---

## Bugs in current Python code (eliminated by rewrite)

| Location | Bug |
|---|---|
| `utils.py:148` | `combineUnits`: doubles value (`unitDict1[unit] += unitDict1[unit]`) |
| `utils.py:98` | Function not called: `numberOfSubsInAssignments == subCount` |
| `battle.py` | No destroyer check — subs always Surprise Strike |
| `player.py` | Same missing destroyer check in rollSurpriseStrikes |
| `player.py` | landParatroopers: cargo not handled |
| `units.py` | Transport.getDice() returns list; Dice.roll() expects scalar |
| `test.py:22` | Always-truthy: `if [TESTS['startUnits']]:` |

---

## Missing rules (implemented in this rewrite)

- Submarine Target Select (pre-declared; API-provided or auto-generated; validated on receipt)
- Destroyer detection cap with Super Submarines (3 subs per destroyer)
- Tactical bomber Target Select (round 1 only, negated by AAA, loses combined arms for battle)
- Capital ship damage state (halved A/D/M, re-evaluated per timing rules)
- Combined arms: TAC+Tank, TAC+Fighter (A=4), BB+Cruiser (D=4), TPT+TPT (D=1)
- AAA pool cap (min of pool vs # attacking air) and source selection by defender
- Strategic bomber compulsory removal after round 1
- Shore bombardment (round 1 step 3, immune to casualties)
- Casualty strip (step 2 casualties don't fire in 3/4; step-4 casualties do)
- Defenseless transport auto-destroy (not triggered by strat bombers)
- Air → sub hit restriction (requires friendly destroyer)
- Super Battleship: 2 dice (4,2), HP=3, AAA hits ≤2
- Super Carriers: HP=3, fully operational at 1 hit
- Improved Transports: D=1 individually, capacity 3
- Self-Propelled Artillery: 1:2 support ratio
- Radar and ATC: AAA units hit ≤2

---

## Directory structure

```
src/
  engine/
    state.ts               Readonly types: Unit, Side, BattleState, StepResult
    events.ts              Discriminated union Event type + event constructors
    dice.ts                Mulberry32 seeded PRNG wrapper
    engine.ts              runBattle(), runCampaign()
  steps/
    step1Place.ts          Battle board placement, capital ship damage re-eval
    step2Special.ts        AAA volley, sub TS/SS, tac bomber TS
    step3Attackers.ts      Attacker fire + shore bombardment
    step4Defenders.ts      Defender fire (includes casualty strip)
    step5Remove.ts         Remove defender casualty strip
    step6Terminate.ts      Press/retreat; compulsory strat bomber removal
    step7Conclude.ts       Capture logic, final events
  rules/
    profile.ts             resolveProfile(unit, ctx) → effective stats
    combinedArms.ts        computePairings(firingSide, step, state)
    casualtyTargeting.ts   legalCasualties(hit, candidates, state)
    airDefense.ts          computeAAAPool(sources, nAir, tech)
    capitalShip.ts         damageState(unit), isHalved(unit), timing logic
    submarines.ts          effectiveSubsCancelled(subs, destroyers, hasSuperSub)
    bomber.ts              isCompulsoryRemoval(unit, round)
  strategies/
    types.ts               CasualtyStrategy, TargetSelectStrategy, RetreatStrategy interfaces
    casualty.ts            Default order-of-loss strategy
    retreat.ts             Default retreat strategy (never retreats; pluggable)
    targetSelect.ts        Validation + auto-generation of TS assignments
  profiles/
    units.ts               Base unit stats (typed const object, all 15 unit types)
    tech.ts                Tech overlays (typed const, keyed by TechId)
    combinedArms.ts        Pairing table (typed const array)
    casualtyOrder.ts       Default order of loss by role × terrain
  api/
    schemas.ts             Zod schemas → inferred request/response types
    routes.ts              Fastify route handlers (thin adapter over engine)
    simulation.ts          Monte Carlo runner (synchronous loop, seeds per iteration)
  index.ts                 Fastify app creation + server listen
```

---

## Key types

```typescript
// Immutable unit — spread to update
type Unit = Readonly<{
  id: string;              // unique within battle, e.g. "inf_0"
  type: UnitType;
  owner: PlayerId;
  hpTaken: number;         // capital ships only; 0 = undamaged
  tags: ReadonlySet<string>;
}>;

type Side = Readonly<{
  player: PlayerId;
  units: readonly Unit[];
  tech: ReadonlySet<TechId>;
  casualtyStrip: readonly Unit[];
  hasFiredAaa: boolean;
}>;

type BattleState = Readonly<{
  terrain: Terrain;
  attacker: Side;
  defender: Side;
  round: number;
  aaaHasFired: boolean;
  flags: ReadonlySet<string>;
}>;

type StepResult = Readonly<{
  state: BattleState;
  events: readonly Event[];
}>;
```

---

## Event types (discriminated union)

```typescript
type Event =
  | { kind: 'DiceRolled'; step: number; unitId: string; threshold: number; roll: number; hit: boolean }
  | { kind: 'HitAssigned'; sourceId: string; targetId: string; reason: HitReason }
  | { kind: 'CasualtyOptionsConsidered'; hitFrom: string; eligibleIds: string[]; chosenId: string; strategy: string }
  | { kind: 'CapitalShipDamaged'; unitId: string; hpTaken: number; newAttack: number; newDefense: number }
  | { kind: 'PairingActivated'; step: number; supporterId: string; supportedId: string; stat: string; before: number; after: number }
  | { kind: 'TechModifierApplied'; unitId: string; techId: TechId; field: string; before: number; after: number }
  | { kind: 'TargetSelectDeclared'; unitId: string; targetId: string; auto: boolean }
  | { kind: 'AAAVolleyFired'; totalShots: number; hits: number; casualties: string[] }
  | { kind: 'RoundEnded'; round: number; attackerCount: number; defenderCount: number }
  | { kind: 'BattleEnded'; outcome: Outcome; capturedBy: PlayerId | null };
```

---

## API endpoints

### `POST /battles`
Single deterministic battle. Returns full event log + final state.

**Request body:**
```typescript
{
  terrain: 'land' | 'sea';
  attacker: { tech: TechId[]; units: Record<UnitType, number>; orderOfLoss?: UnitType[] };
  defender: { tech: TechId[]; units: Record<UnitType, number>; orderOfLoss?: UnitType[] };
  seed?: number;
  subTargetAssignments?: Record<string, string>;      // unitId → targetId (validated/auto-generated)
  tacTargetAssignments?: Record<string, string>;
}
```

**Response:**
```typescript
{
  outcome: Outcome;
  rounds: number;
  survivingAttacker: Record<UnitType, number>;
  survivingDefender: Record<UnitType, number>;
  ipcLost: { attacker: number; defender: number };
  events: Event[];
}
```

### `POST /battles/simulate`
Monte Carlo simulation. N independent seeded runs.

**Request body:**
```typescript
{
  terrain: 'land' | 'sea';
  attacker: { tech: TechId[]; units: Record<UnitType, number>; orderOfLoss?: UnitType[] };
  defender: { tech: TechId[]; units: Record<UnitType, number>; orderOfLoss?: UnitType[] };
  nIterations?: number;        // default 20000
  seed?: number;               // base seed; each iteration uses seed+i
  subTargetAssignments?: Record<string, string>;
  tacTargetAssignments?: Record<string, string>;
}
```

**Response:**
```typescript
{
  stats: {
    attackerWinRate: number;
    defenderWinRate: number;
    drawRate: number;
    avgRounds: number;
    avgIpcLost: { attacker: number; defender: number };
  };
  outcomeDistribution: {
    attacker: Array<{ units: Record<UnitType, number>; probability: number; ipcLost: number }>;
    defender: Array<{ units: Record<UnitType, number>; probability: number; ipcLost: number }>;
  };
}
```

---

## Target assignment validation & auto-generation

Handled in `src/strategies/targetSelect.ts` and enforced in `src/api/schemas.ts` via Zod `.superRefine()` before any simulation runs.

**Validation (fail-fast → HTTP 422):**
1. Each assigning unit must be present in attacker's force.
2. Declared target must be in defender's force.
3. Sub TS: target cannot be an air unit.
4. Tac bomber TS: target cannot be infantry, air, transport, or submarine.
5. Sub TS: only subs not negated by destroyer detection cap may declare. Cap = `3 × nDestroyers` with Super Sub tech; else any destroyer negates all subs.

**Auto-generation (no assignments provided):**
1. Compute eligible units after applying destroyer cap.
2. Greedy-pick highest-priority valid target from static priority order.
3. Multiple units may declare the same target (excess hits lost, not reassigned per rules).
4. Every auto-generated assignment emits `TargetSelectDeclared` with `auto: true`.

---

## Implementation phases

| Phase | Scope |
|---|---|
| 0 | Project scaffold: `package.json`, `tsconfig.json`, `vitest.config.ts`, install deps |
| 1 | Core types: `engine/state.ts`, `engine/events.ts`, `engine/dice.ts` |
| 2 | Profiles: `profiles/units.ts`, `profiles/tech.ts`, `profiles/combinedArms.ts`, `profiles/casualtyOrder.ts` |
| 3 | Rules: all 7 `rules/*.ts` modules (pure functions, no I/O) |
| 4 | Strategies: `strategies/types.ts` + default implementations |
| 5 | Steps: `steps/step1Place.ts` … `steps/step7Conclude.ts` |
| 6 | Engine: `engine/engine.ts` (`runBattle`, `runCampaign`) |
| 7 | API: `api/schemas.ts`, `api/routes.ts`, `api/simulation.ts`, `index.ts` |
| 8 | Tests: unit rule tests, step scenario tests, golden seeded scenarios |
| 9 | Migration: remove Python files, update CLAUDE.md |

---

## Verification

```bash
# Type check (zero errors)
npx tsc --noEmit

# Run all tests
npx vitest run --coverage

# Dev server
npx tsx src/index.ts

# Single seeded battle
curl -X POST http://localhost:8000/battles \
  -H 'Content-Type: application/json' \
  -d '{"terrain":"land","attacker":{"tech":[],"units":{"Infantry":3}},"defender":{"tech":[],"units":{"Infantry":3}},"seed":42}'

# Reproducibility check (run twice — events must be identical)
curl -X POST http://localhost:8000/battles \
  -H 'Content-Type: application/json' \
  -d '{"terrain":"sea","attacker":{"tech":[],"units":{"Submarine":3}},"defender":{"tech":[],"units":{"Destroyer":1}},"seed":42}'

# Monte Carlo smoke test
curl -X POST http://localhost:8000/battles/simulate \
  -H 'Content-Type: application/json' \
  -d '{"terrain":"land","attacker":{"tech":[],"units":{"Infantry":5,"Artillery":2}},"defender":{"tech":[],"units":{"Infantry":5}},"nIterations":1000}'
```
