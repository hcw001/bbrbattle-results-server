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
pip install -r requirements.txt

# Run locally (port 8000, debug mode)
python main.py

# Run production server
gunicorn main:app

# Run all test scenarios
python -m test.test
```