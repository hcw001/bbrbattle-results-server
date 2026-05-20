# Testing

## Design principles

Tests are config-driven: a scenario is a JSON input (force composition, tech, seed) plus an assertion. No test should require editing engine code to add. Use `pytest`. All dice flow through a seeded RNG — tests pin seeds so results are deterministic and reproducible.

Assert on the **event log**, not just final state. The event log answers "what happened, to whom, why" — it is the ground truth for behavioral correctness.

## Test categories

**Rule unit tests** — pure functions, no RNG. Test one rule in isolation: targeting restrictions, combined arms pairing, AAA pool calculation, capital ship damage state, sub detection cap. Fast and abundant.

**Step scenario tests** — seeded battle configs that assert specific events fired in the right order. Examples: all subs Target Select when no opposing destroyer is present; a tac bomber that used Target Select fires at A=3 (not 4) in round 2; a strat bomber is compulsorily removed after round 1; AAA fires once before round 1 and never again.

**Comparative outcome tests** — run a force composition N times and assert win rates fall within an expected range. Used to validate relative performance: attacker A should beat attacker B against the same defender, force X with tech should outperform force X without tech, etc.

## Coverage

Every row in the combined arms table and every row in the targeting restrictions table should have at least one explicit test. Every tech in the research table should have at least one scenario that activates it and asserts on the change. Every step-2 special rule (Target Select pre-declaration, Surprise Strike no-declaration, sub submerge, AAA timing) should have a named scenario test.
