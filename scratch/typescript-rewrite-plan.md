# TypeScript rewrite — implementation plan

## Status: In progress
Started: 2026-05-20

---

## Context

Complete ground-up TypeScript rewrite of the BBR combat simulator. The existing Python/Flask
implementation has 7 confirmed bugs and 15+ missing mechanics. The PLAN.md describes the full
architecture. Nothing in TypeScript has been started.

Current state:
- Python codebase: main.py (Flask), battle.py, player.py, units.py, config.py, simulation.py
- No `src/` directory exists
- No package.json, tsconfig.json, or any TypeScript toolchain configured
- `scratch/` directory exists but is empty

The target is a complete TypeScript rewrite using Fastify v5 + Zod + Vitest, producing
an identical API surface to what the frontend at bbr40.com already expects, but with
correct rule implementation, full auditability via event log, and strict types throughout.

---

## Why this rewrite

The Python implementation uses mutable state, monolithic classes, and has no event log.
The TypeScript rewrite:
1. Eliminates all 7 known bugs (doubles combineUnits, missing destroyer checks, etc.)
2. Implements 15+ missing mechanics (sub target select, capital ship damage timing, etc.)
3. Provides a full event log for auditability (every dice roll, casualty decision, tech modifier)
4. Uses immutable state (Readonly<T> + spread updates — no mutation)
5. Seeded RNG for reproducibility and testing

---

## Architecture decisions

**Why Fastify over Express/Flask:** TypeScript-native, schema-first, significantly faster
**Why Zod over raw TS types:** runtime validation + inferred static types from one declaration
**Why Vitest over Jest:** faster, native TS support, identical API
**Why mulberry32:** zero-dependency seeded PRNG, well-tested, extremely fast
**Why const objects for profiles over YAML:** full type safety + editor autocomplete; no
  runtime parsing or schema mismatch

---

## Phase plan

### Phase 0 — Project scaffold
Files: `package.json`, `tsconfig.json`, `vitest.config.ts`
Deps: fastify@5, @fastify/cors, zod, vitest, @types/node, tsx, typescript

Key tsconfig settings:
- `"strict": true`
- `"moduleResolution": "bundler"` (works with tsx + Node)
- `"target": "ES2022"` (supports top-level await)
- `"noUncheckedIndexedAccess": true`

### Phase 1 — Core types
Files: `src/engine/state.ts`, `src/engine/events.ts`, `src/engine/dice.ts`

`state.ts` exports: `UnitType`, `TechId`, `Terrain`, `PlayerId`, `Outcome`,
`HitReason`, `Unit`, `Side`, `BattleState`, `StepResult`

`events.ts` exports: discriminated union `Event` type + typed constructor helpers

`dice.ts` exports: `Dice` class wrapping mulberry32 — `roll()` returns 1-6, constructed
with a seed, exposes `clone()` for deterministic branching

### Phase 2 — Profiles
Files: `src/profiles/units.ts`, `src/profiles/tech.ts`,
       `src/profiles/combinedArms.ts`, `src/profiles/casualtyOrder.ts`

`units.ts`: typed const record keyed by `UnitType` → `{ attack, defense, move, hp, ipc, ... }`
`tech.ts`: typed const record keyed by `TechId` → partial unit stat overrides + special flags
`combinedArms.ts`: typed const array of pairing rules (supporter type, supported type, effect, when)
`casualtyOrder.ts`: typed const record by terrain × role → `UnitType[]`

### Phase 3 — Rules (pure functions, no I/O)
Files: `src/rules/profile.ts`, `src/rules/combinedArms.ts`,
       `src/rules/casualtyTargeting.ts`, `src/rules/airDefense.ts`,
       `src/rules/capitalShip.ts`, `src/rules/submarines.ts`, `src/rules/bomber.ts`

Each module is a set of pure functions: input = (unit/state/context), output = derived value.
No RNG, no mutation, no I/O.

`profile.ts`: `resolveProfile(unit, state)` → effective `{ attack, defense, hp, ... }` after
  applying damage state + tech modifiers + combined arms buffs

`combinedArms.ts`: `computePairings(firingSide, step, state)` → Map<unitId, buffAmount>
  Evaluates at time of firing; units on casualty strip count.

`casualtyTargeting.ts`: `legalCasualties(hit, candidates, state)` → filtered Unit[]
  Enforces: air→sub requires destroyer, subs can't hit air, transports last, etc.

`airDefense.ts`: `computeAAAPool(sources, nAir, tech)` → { shots, threshold }[]
  Implements the min(pool, nAir) cap and defender source-selection logic.

`capitalShip.ts`: `isHalved(unit)`, `resolveCapitalShipStats(unit, ctx)` → effective stats
  Implements timing carve-out: undamaged hit in steps 3-4 fires at full values that round.

`submarines.ts`: `effectiveSubsCancelled(subs, destroyers, hasSuperSub)` → number
  3-per-destroyer cap with Super Sub tech; else all cancelled by any destroyer.

`bomber.ts`: `isCompulsoryRemoval(unit, round)` → boolean
  Strat bombers removed after round 1 unless already killed.

### Phase 4 — Strategies (pluggable interfaces)
Files: `src/strategies/types.ts`, `src/strategies/casualty.ts`,
       `src/strategies/retreat.ts`, `src/strategies/targetSelect.ts`

`types.ts`: interfaces `CasualtyStrategy`, `RetreatStrategy`, `TargetSelectStrategy`
`casualty.ts`: default order-of-loss (reads casualtyOrder profile, falls back to cheapest)
`retreat.ts`: default = never retreat (attacker presses on unless forced to stop)
`targetSelect.ts`: validation + auto-generation of sub/tac assignments

### Phase 5 — Steps
Files: `src/steps/step1Place.ts` ... `src/steps/step7Conclude.ts`

Each step: `(state: BattleState, dice: Dice, strategies) → StepResult`

`step1Place`: place units on battle board, re-evaluate capital ship damage states
`step2Special`: AAA volley (round 1 only), sub TS/SS/submerge, tac bomber TS
`step3Attackers`: attacker fire + shore bombardment (round 1 amphibious)
`step4Defenders`: defender fire including casualty strip
`step5Remove`: remove defender casualties from casualty strip
`step6Terminate`: compulsory strat bomber removal; press/retreat decision
`step7Conclude`: capture logic, final events

### Phase 6 — Engine
File: `src/engine/engine.ts`

`runBattle(state, dice, strategies)` → `BattleResult`:
  drives steps 1-7 per round, accumulates events, checks termination
`runCampaign(battles)` → `BattleResult[]`:
  reduces over battles; survivors of N flow into N+1

### Phase 7 — API
Files: `src/api/schemas.ts`, `src/api/routes.ts`, `src/api/simulation.ts`, `src/index.ts`

`schemas.ts`: Zod schemas → inferred request/response types
  - `BattleRequestSchema`, `SimulateRequestSchema`
  - `.superRefine()` for target assignment validation (fail-fast 422)
`routes.ts`: Fastify route handlers — thin adapter
  - `POST /battles` → single deterministic battle
  - `POST /battles/simulate` → Monte Carlo
`simulation.ts`: Monte Carlo runner — synchronous loop, seeds = baseSeed + i
`index.ts`: Fastify app creation, CORS setup, register routes, listen on 8000

---

## Key implementation invariants

1. **No mutation.** All state updates via spread. Arrays are `readonly`. Use `ReadonlySet`.
2. **Engine has zero HTTP imports.** `src/engine/` and `src/steps/` and `src/rules/` cannot
   import from `src/api/`.
3. **All dice flow through `Dice`.** No `Math.random()` anywhere.
4. **resolveProfile is the single source of truth** for unit stats. Steps never read raw
   profile constants directly.
5. **Events are emitted for every meaningful decision.** DiceRolled per die, not per unit.
6. **Target assignments validated before any simulation starts.** HTTP 422 on invalid input.

---

## Verification commands

```bash
npx tsc --noEmit                          # zero errors
npx vitest run --coverage                 # all tests pass
npx tsx src/index.ts                      # dev server starts

# Single seeded battle
curl -X POST http://localhost:8000/battles \
  -H 'Content-Type: application/json' \
  -d '{"terrain":"land","attacker":{"tech":[],"units":{"Infantry":3}},"defender":{"tech":[],"units":{"Infantry":3}},"seed":42}'

# Monte Carlo smoke test
curl -X POST http://localhost:8000/battles/simulate \
  -H 'Content-Type: application/json' \
  -d '{"terrain":"land","attacker":{"tech":[],"units":{"Infantry":5,"Artillery":2}},"defender":{"tech":[],"units":{"Infantry":5}},"nIterations":100}'
```

---

## Append log

### 2026-05-20 — Starting implementation
Phase 0 scaffold begins. No src/ exists. Starting with package.json + tsconfig + vitest config,
then installing deps, then implementing phases 1-7 in order.

### 2026-05-21 — Phases 0–8 complete
All 30 source files written. 46 tests pass, 0 type errors.

**Fixes made during implementation:**
- `src/engine/state.ts`: Added explicit `import type { Event }` to avoid DOM `Event` clash —
  TypeScript was silently resolving the name as the browser global. Also removed duplicate re-export.
- `src/engine/engine.ts`: Aliased import as `BattleEvent` to avoid same clash in the engine file.
- `src/steps/step6Terminate.ts`: Fixed compulsory strat bomber removal — original check
  `if (s.round > 1)` ran too late (after round was incremented). Changed to `s.round === 1` so
  removal fires at the END of round 1, before the loop restarts for round 2.

**Smoke test results:**
- `POST /battles` (3 inf vs 3 inf, seed 42): outcome=defender, 3 rounds, 25 events — 13ms
- `POST /battles/simulate` (5 inf + 2 art vs 5 inf, n=100): attackerWinRate=0.80, avgRounds=3.67 — 15ms

**Phase 9 complete:**
- Added `src/api/legacyAdapter.ts`: maps legacy Python unit types (DamagedBattleship, SuperBattleship,
  SurpriseStrikeSubmarine, etc.) and integer tech codes to new engine types. Infers implied tech from
  derived unit types (SuperBattleship → SuperBattleships tech). Produces legacy response shape with
  unitsAlive / unitsDead / outcomePercentile / outcomeCount / ipcLoss arrays.
- Added `/api/calculate` route in `routes.ts` — backward-compatible with bbr40.com frontend.
- Removed all Python files (battle.py, config.py, encoder.py, lib.py, main.py, player.py,
  requirements.txt, simulation.py, store.py, units.py, utils.py, __init__.py, test/).
- Updated CLAUDE.md commands (npm/tsx), added API endpoint table.
- Updated Procfile from gunicorn to `node --import tsx/esm src/index.ts`.
- 57 tests pass, 0 type errors.
