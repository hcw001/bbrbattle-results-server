# Architecture

## Overview

A deterministic, event-sourced combat simulator. Battles are pure functions over an immutable `BattleState`, advanced by step handlers that emit events. The event log is both the audit trail and the API response.

```
┌─────────────────────────────────────────────────────────────┐
│  API layer (FastAPI / Flask)                                │
│   - POST /battles  → run a single battle                    │
│   - POST /campaigns → run sequential battles                │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│  Engine (orchestrator)                                      │
│   - Drives the per-round step sequence                      │
│   - Owns the BattleState; applies StepResult deltas         │
│   - Emits events to the EventLog                            │
└─────────────────────────────────────────────────────────────┘
        │              │              │              │
┌───────▼────┐  ┌──────▼─────┐  ┌─────▼──────┐  ┌────▼────────┐
│  Steps     │  │  Rules     │  │ Strategies │  │  RNG        │
│ (step1…7)  │  │ (pure)     │  │ (pluggable)│  │ (seeded)    │
└────────────┘  └────────────┘  └────────────┘  └─────────────┘
                       │
                ┌──────▼──────┐
                │  Profiles   │  unit stats + tech mutations
                │  (config)   │  single source of truth
                └─────────────┘
```

## Core Tenets

1. **Immutable state, explicit deltas.** `BattleState` is a frozen dataclass. Steps return a `StepResult(events, new_state)`; the engine applies it. No hidden mutation, no spooky action at a distance.
2. **Event log is the product.** Every dice roll, every casualty option, every casualty chosen, every tech-driven modifier — emitted as a typed event. Logs, replay, and API response all derive from this single stream.
3. **Profiles are data, not code.** All unit stats, tech effects, and combined-arms pairings live in declarative config (`profiles/`). Computing "what does this unit do right now?" goes through `resolve_profile(unit, context)` — never read raw fields directly in combat logic.
4. **One step = one module.** `steps/step_1_place.py`, `steps/step_2_special.py`, … `steps/step_7_conclude.py`. The reference doc maps 1:1 to filenames. Agents extending behavior know exactly where to look.
5. **Rules are pure functions.** `rules/combined_arms.py`, `rules/casualty_targeting.py`, `rules/capital_ship_damage.py` — each takes state, returns a derived value or a list of legal options. No I/O, no RNG inside rule modules.
6. **Strategies are pluggable interfaces.** `CasualtyStrategy`, `RetreatStrategy`, `SubmergeStrategy`, `TargetSelectStrategy`. Default implementations live in `strategies/default/`. Per-player overrides are injected at battle construction.
7. **RNG is injected and seeded.** All dice flow through a single `Dice` object. Reproducibility is non-negotiable; tests pin seeds, and replay equals re-execution.
8. **Combat is composable.** A battle is a function `run_battle(state) → BattleResult`. A campaign is just `reduce(run_battle, battles, initial_state)`. No special "campaign mode" — survivors flow naturally.

## Module Layout

```
src/bbr/
  api/                      # HTTP layer; thin adapters
    routes.py
    schemas.py              # request/response DTOs
  engine/
    state.py                # BattleState, Unit, Side (frozen)
    engine.py               # run_battle(); the orchestrator
    events.py               # Event types + EventLog
    dice.py                 # seeded RNG wrapper
  steps/
    step_1_place.py         # Battle Board placement; damage re-eval
    step_2_special.py       # AAA volley, sub TS/SS/Submerge, tac TS
    step_3_attackers.py
    step_4_defenders.py
    step_5_remove.py
    step_6_terminate.py     # press/retreat decision
    step_7_conclude.py      # capture, return survivors
  rules/
    profile.py              # resolve_profile(unit, ctx)
    combined_arms.py        # pairing resolution at time of firing
    casualty_targeting.py   # legal targets given a hit
    air_defense.py          # AAA pool, cap, source selection
    capital_ship.py         # damage state, halved stats, timing carve-out
    submarines.py           # destroyer-cancellation, super-sub detection cap
    bomber.py               # strat bomber round-1-only, reclassification
  strategies/
    base.py                 # Strategy protocols
    default/
      casualty.py           # default order of loss (config-driven)
      retreat.py
      submerge.py
      target_select.py
  profiles/
    units.yaml              # base stats per unit
    tech.yaml               # tech effect overlays
    combined_arms.yaml      # pairing table
    casualty_order.yaml     # default order of loss (role × terrain)
  config.py                 # loaders for the above

tests/
  unit/                     # per-rule, per-step
  scenarios/                # full-battle goldens with pinned seeds
  fixtures/                 # named force compositions
```

## Key Data Types

```python
@dataclass(frozen=True)
class Unit:
    id: str
    type: UnitType           # 'Infantry', 'Battleship', ...
    owner: PlayerId
    hp_taken: int = 0        # for capital ships
    tags: frozenset[str]     # 'seaborne', 'air-assigned-sea', etc.

@dataclass(frozen=True)
class Side:
    player: PlayerId
    units: tuple[Unit, ...]
    tech: frozenset[TechId]
    casualty_strip: tuple[Unit, ...] = ()

@dataclass(frozen=True)
class BattleState:
    terrain: Terrain          # 'land' | 'sea'
    attacker: Side
    defender: Side
    round: int
    flags: Flags              # 'aaa_fired', 'tac_ts_used_this_battle', ...

@dataclass(frozen=True)
class StepResult:
    state: BattleState
    events: tuple[Event, ...]
```

## Event Model

Every event answers "what happened, to whom, why?" Events are typed (no stringly-typed payloads) so agents can pattern-match.

```python
DiceRolled(step, unit_id, threshold, rolls, hits)
HitAssigned(source_unit, target_unit, reason)         # 'normal' | 'target_select' | 'surprise_strike'
CasualtyOptionsConsidered(hit, eligible_unit_ids, chosen_id, strategy_name)
CapitalShipDamaged(unit_id, hp_taken, new_stats)
PairingActivated(step, supporter_id, supported_id, effect)
TechModifierApplied(unit_id, tech_id, field, before, after)
SubmergedSet(unit_id)
TargetSelectDeclared(unit_id, target_id)
RoundEnded(round, surviving_attackers, surviving_defenders)
BattleEnded(outcome, captured_by)
```

Every dice roll names the unit, threshold, and result, satisfying the audit requirements: "what dice were rolled for which units" and "what were the potential targets for each hit" come straight out of `DiceRolled` + `CasualtyOptionsConsidered`.

## Extension Points

Building on this is a matter of swapping a component, not editing the engine:

- **Sequential battles** → `run_campaign(states)` reuses `run_battle`. Survivors of battle N become the input force of battle N+1; the engine doesn't know the difference.
- **Custom casualty heuristics** → implement `CasualtyStrategy.choose(hit, eligible_units, state) → Unit` and pass it per player when constructing the battle.
- **New tech** → add a row to `tech.yaml`; `resolve_profile` picks it up. No engine changes.
- **New unit type** → add to `units.yaml` plus any rule-specific hook (e.g. a new combined-arms row in `combined_arms.yaml`).
- **House rules / variants** → subclass a step module, or compose your own step pipeline. The engine takes the pipeline as an argument.

## Determinism & Testability

- Seeded RNG → identical inputs produce identical event logs.
- Scenario tests assert on event *shapes*, not full equality, so refactors stay green.
- Goldens for canonical battles (1 SBB vs 3 subs, amphibious assault with scrambled fighters, etc.) live in `tests/scenarios/` and double as living documentation.
- Each rule module is independently testable because it's pure.

## What This Architecture Optimizes For

Agentic development thrives on locality and predictability. An agent picking up "add the Improved Transports tech" should be able to:

1. Open `profiles/tech.yaml`, add the entry.
2. Open `profiles/units.yaml`, confirm the field it overrides exists.
3. Maybe add a scenario test.

It should not need to grep the engine. That's the goal: rules-as-data, steps-as-modules, strategies-as-interfaces, and a single event stream that explains everything that happened.