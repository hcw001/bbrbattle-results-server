# Battle Simulator — Architecture

## Design Principles

Before the architecture, the principles that drive every decision below:

1. **Pure functions over mutable state.** Combat resolution is deterministic given (state, dice, decisions). Pure functions make it testable, replayable, and trivial to fork for "what-if" analysis.
2. **Decisions are explicit inputs, not embedded logic.** Every place a player makes a choice (casualty selection, retreat, submerge, scramble) is a hookable interface. Default to a "naive" implementation; let users swap in RL, heuristic, or human-driven.
3. **Dice are an injected dependency.** Never call `random()` inside resolution logic. Pass an RNG (or a pre-rolled dice sequence) in. This makes tests deterministic, gives you replay-ability for free, and lets you do statistical analysis by feeding the same battle through 10,000 seeded runs.
4. **Events are the source of truth for audit; state is derived.** Every dice roll, casualty assignment, retreat decision emits a structured event. The final battle state is a fold over the event stream. You get logs, replay, and analysis from one mechanism.
5. **Rules are data where possible, code where necessary.** Unit profiles, combined-arms pairings, tech effects → data. Resolution sequence → code. This is the line between "config-driven" and "logic-driven."

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                      API Layer                           │
│  (HTTP/RPC handlers, request validation, serialization)  │
└─────────────────┬────────────────────────────────────────┘
                  │
┌─────────────────▼────────────────────────────────────────┐
│                  Battle Orchestrator                     │
│  - Manages multi-phase combat (bombing → naval →         │
│    amphibious → general)                                 │
│  - Sequences battles, threads survivors forward          │
│  - Aggregates events, returns BattleResult               │
└──┬───────────────┬────────────────────┬──────────────────┘
   │               │                    │
   ▼               ▼                    ▼
┌──────────┐  ┌──────────────┐  ┌─────────────────────┐
│ Resolver │  │  Decision    │  │     Event Bus       │
│ (pure)   │◄─┤  Providers   │  │  (append-only log)  │
│          │  │  (per-player)│  │                     │
│ Round    │  └──────────────┘  └─────────────────────┘
│ machine  │         ▲
└────┬─────┘         │
     │               │
     ▼               │
┌──────────────────────────────────────────────────────────┐
│                    Rule Engine                           │
│  - Unit registry (data)         - Combined arms (data)   │
│  - Tech modifiers (data+hooks)  - Targeting rules        │
│  - Dice service                                          │
└──────────────────────────────────────────────────────────┘
```

---

## Layer 1: Rule Engine (the deterministic core)

This is pure logic and data. No I/O, no randomness except through the injected dice service.

- **Unit Registry**: each unit type as a typed record. Cost, attack, defense, movement, HP, capacity, tech upgrade ID, ability flags (`can_blitz`, `is_capital_ship`, `cargo_only`, etc.). All from §2 of the reference.
- **Combined Arms Table**: data structure listing pairings, the effect they produce, and the phase they're active in. Resolved at the start of each round into a `pairings: Map<UnitId, PairingEffect>` snapshot. From §3.
- **Tech Modifiers**: each tech is a function `(unit_profile, tech_set) → unit_profile` plus optional hooks into the resolver pipeline. Applied lazily — never mutate base profiles. From §7.
- **Dice Service**: interface with two implementations: `RealDice(seed)` and `ScriptedDice([1,4,2,...])`. Every roll is logged with a roll ID, source unit, and context (e.g., `"attack roll, round 2, sub Target Select"`).
- **Targeting Rules**: a pure function `eligible_targets(hit_source, available_units, battle_context) → List<Unit>`. Encodes §8: air-can't-hit-subs-without-destroyer, transports-last, tac-bomber-forbidden-targets, etc.

---

## Layer 2: The Resolver (the state machine)

A pure function `resolve_round(battle_state, decisions, dice) → (new_state, events)`. Implements the round loop from §4: place units, special step (subs + tac bombers + AAA), attacker fires, defender fires, remove casualties, termination check.

Critically, the resolver does **not** decide. When a casualty must be picked, when a sub must choose Strike-vs-Submerge, when an attacker must choose retreat-vs-press — the resolver *requests a decision* via a callback. This is what makes RL integration trivial later.

```
resolve_battle(initial_state, decision_providers, dice) -> BattleResult
  events = []
  state = initial_state
  while not terminated(state):
    state, round_events = resolve_round(state, decision_providers, dice)
    events.extend(round_events)
  return BattleResult(final_state=state, events=events)
```

---

## Layer 3: Decision Providers (the pluggable layer)

```
interface DecisionProvider:
  select_casualties(hits: int, eligible: List[Unit], context) -> List[Unit]
  submarine_action(sub: Unit, context) -> Action.STRIKE | SUBMERGE
  attacker_retreat(context) -> Optional[RetreatDestination]
  tac_bomber_target_select(bomber: Unit, context) -> Optional[Unit]
  declare_interceptors(territory, context) -> List[Fighter]
  declare_scrambles(sea_zone, context) -> List[AirUnit]
  ... etc.
```

One provider per player per battle. Ships with:

- **`NaiveProvider`** — sensible defaults (cheapest casualties first, never retreat, never submerge unless forced).
- **`OptimalProvider`** — minimax-ish for casualty selection (a few common heuristics).
- **`ScriptedProvider`** — for tests: replay pre-recorded decisions.
- **`ExternalProvider`** — wraps an HTTP/RPC call so an RL agent or a human UI can drive decisions over the wire.

This is the single most important architectural choice for the stated goals. RL plug-in is now just a class.

---

## Layer 4: The Battle Orchestrator

Handles the per-turn combat sequence from §1.3: bombing raids → blockades → amphibious assaults → general combat. Threads results between phases (e.g., amphibious assault's sea combat outcome determines whether bombardment proceeds and whether land combat happens).

This is also where **sequential battles** live cleanly:

```
def run_engagement_chain(initial_forces, battle_definitions, providers, dice):
  survivors = initial_forces
  results = []
  for battle_def in battle_definitions:
    attackers = survivors.matching(battle_def.attacker_filter)
    battle_state = build_state(attackers, battle_def.defenders)
    result = resolve_battle(battle_state, providers, dice)
    survivors = result.surviving_attackers + (survivors - attackers)
    results.append(result)
  return EngagementResult(results, final_survivors=survivors)
```

Because state is immutable and pure, this is trivial.

---

## Layer 5: Event Bus & Audit

Every meaningful action emits a typed event:

```
DiceRolled { roll_id, source_unit_id, context, values, hits }
CasualtyAssigned { hit_source, target_unit_id, decided_by, eligible_alternatives }
SubmarineAction { unit_id, action: STRIKE|SUBMERGE|TARGET_SELECT, target?, decided_by }
RoundStarted { round_number, attackers, defenders }
RoundEnded { round_number, attacker_losses, defender_losses }
CombatTerminated { reason: ATTACKER_RETREAT | DEFENDER_WIPED | MUTUAL_WIPE, ... }
PairingResolved { round, unit_a, unit_b, effect }
TechApplied { tech_id, affected_units }
```

The event log is the audit trail. To answer "what dice were rolled in round 2?" you filter `DiceRolled` events with `round=2`. To answer "what were the casualty alternatives?" you read the `eligible_alternatives` field on `CasualtyAssigned`. No special logging code, no debug instrumentation — it's the architecture.

---

## Layer 6: API Surface

Thin. Validate input, build initial `BattleState`, call orchestrator, serialize result.

```
POST /battles/simulate
  body: { attackers, defenders, terrain, attacker_techs, defender_techs,
          rng_seed?, attacker_provider?, defender_provider? }
  returns: { result: { winner, survivors, ... }, events: [...] }

POST /engagements/chain
  body: { initial_forces, battles: [...], providers, rng_seed? }
  returns: { battles: [...], final_survivors }

POST /battles/analyze
  body: { ...battle_spec, iterations: 10000 }
  returns: { p_attacker_win, expected_losses, distribution, ... }
  (internally: run resolve_battle N times with different seeds)
```

The analysis endpoint comes nearly for free because resolution is pure and seedable.

---

## How This Serves the Stated Goals

- **Auditability** — the event log answers every "what happened and why" question. `CasualtyAssigned` events include the alternatives that were available, so you can reconstruct the decision space. `DiceRolled` events include the context string and the source unit. This is built in, not bolted on.
- **Sequential battles** — pure resolution + immutable state means survivors of one battle are just the input to the next. The orchestrator's engagement-chain function is ~10 lines.
- **RL-pluggable casualty select** — `DecisionProvider` is the seam. An RL agent implements the interface, sees `eligible_alternatives` and `context`, returns its choice. The resolver doesn't know or care that it's an RL agent.
- **Statistical analysis** — seeded dice + pure resolution = run 10,000 battles, aggregate. The analyze endpoint is a thin wrapper.
- **Testability** — `ScriptedDice` + `ScriptedProvider` means every edge case in §10 of the reference becomes a deterministic test: "given these units, this seed, these decisions, the result must be X."

---

## Where to Be Careful

1. **Decision-providers can be queried *during* combat resolution.** This means the resolver yields control mid-function. Implement this either with generators/coroutines (cleanest) or by structuring the resolver as a state machine that returns `Pending(decision_request)` when it needs input. The second is more verbose but easier to serialize for an HTTP-driven flow where the API hands the client a battle ID and asks for decisions over multiple requests.
2. **The decision-request shape needs to be expressive.** Casualty selection isn't just "pick from list" — the provider needs to know hit source, current round, what's already been lost, who's firing next. Design the context object thoughtfully; under-spec'd context handicaps every future RL or heuristic provider.
3. **Tech modifiers can interact.** Improved Shipyards changes costs (not combat-relevant). Super Battleships and Radar both touch AAA fire. Decide upfront whether modifiers compose (both apply, or last-wins, or one supersedes). The reference §12 flags this for AAA — the architecture needs an explicit composition rule. Recommendation: each modifier declares its precedence, and a composition function applies them in order.
4. **Capital ship damage state must be a unit attribute, not a side flag.** Damage affects attack, movement, eligibility for bombardment, AAA capability. Make it a first-class field on the unit's runtime state, recomputed each round-start per §1.4.
5. **Combined Arms pairings are per-round.** Don't bake them into unit state. Compute pairings at round start as a snapshot, apply effects from that snapshot, discard at round end. Avoids stale-pairing bugs.
6. **The "submerged subs return on owner's next turn" rule** crosses battle boundaries. For a single-battle simulator this lives in the result object as `submerged_units`; for engagement chains, the orchestrator threads it forward. Don't let this leak into the per-battle resolver.

---

## Recommended Build Order

1. Unit registry + tech modifier system as pure data + transforms. Validate by writing tech tests: "applying Heavy Tanks to a Tank should yield attack 4."
2. Dice service with both real and scripted implementations.
3. Event types and an in-memory event collector.
4. The general combat round resolver — just §4, no special combat yet. With a `ScriptedProvider` and `ScriptedDice`, write 20 tests from §10 edge cases.
5. Add submarine special-step logic (§4.1). Add destroyer cancellation. Test.
6. Add tactical bomber Target Select. Test the AAA-negation interaction.
7. Bombing raids as a separate orchestrator phase.
8. Amphibious assaults.
9. The orchestrator's engagement chain.
10. The API layer last — it's the thinnest part.