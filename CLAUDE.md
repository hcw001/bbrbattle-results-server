# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# What This Is

The project is a battle simulator for a board game. It provides a robust API for simulating combat in the board game. The objective is to implement an API with all rules of combat configured and executable. Consider that this API and orchestrator must provide robust primitives can may be composed into additional use cases.

## Implementation

An API should initialize players with units. We can they trigger these units to perform combat, simulate dice rolls, and return analysis. This is all very auditable via logs, event, and with transparent logic.

For instance for a given battle I should be able to understand:
* What dice were rolled for which units at each round
* How were casualties taken, what were the potential targets for each hit

## Mechanics

Detailed mechanics of combat in the game and how the battle engine needs to operate can be found in /docs/combat/reference.md.

@docs/combat/reference.md

## Architecture

Consider while designing this architecture and API, that it should be very easy to build on top of - for instance if implementing sequential battles - where the survivors of one battle fight another force, or plugging in different heuristics for casualty selecttion for a player.

Provided a detailed overview of the architectural design of this solution which can be found in /docs/design/architecture.

@docs/design/architecture.md

## Commands

```bash
# Install dependencies
npm install

# Run locally (port 8000)
npx tsx src/index.ts

# Type check (zero errors required)
npx tsc --noEmit

# Run all tests
npx vitest run

# Run tests in watch mode
npx vitest

# Run with coverage
npx vitest run --coverage
```

## API endpoints

| Method | Path | Description |
|---|---|---|
| POST | /battles | Single deterministic battle with full event log |
| POST | /battles/simulate | Monte Carlo simulation (default 20,000 iterations) |
| POST | /api/calculate | Legacy compatibility endpoint used by bbr40.com frontend |
| GET | /health | Health check |

## Testing

Tests are crucial for ensuring the consistency and reliability of this application. You should create robust tests around both the implementation and selected functionality of this battle simulator.

Assert on the **event log**, not just final state. The event log answers "what happened, to whom, why" — it is the ground truth for behavioral correctness.

@docs/design/testing.md

## Workflow

Tasks are tracked in the `## Tasks` section of `PLAN.md` as checkboxes. Two distinct session modes:

- **Exploratory session** — investigate, read code, cross-reference docs. When you find a gap, run `/create-task` to append it to the backlog with enough origin context for a future session to pick it up cold.
- **Execution session** — run `/next-task` to pick the best unblocked task, load its context from the `Found:` field, complete the work, and close out.

When a task is complete, run `/update-changelog`, which will:

1. Mark the task `[x]` in `PLAN.md`.
2. Append a dated entry to `CHANGELOG.md`.

Run `/update-changelog` after any non-trivial work — whether it originated from a `PLAN.md` task or not. Skip it for exploratory work, pure read-only investigation, or single-line fixes.