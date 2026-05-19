# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# What This Is

The project is a battle simulator for a board game. It provides a robust API for simulating combat in the board game.

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

## Current Architecture

Request flow: `main.py` → `Simulation` → `Battle` (×20,000) → `Attacker`/`Defender` → `Unit` subclasses

**`simulation.py`** — Runs N=20,000 `Battle` iterations. Deduplicates outcomes by MD5 hash, then builds probability distributions (percentile-sorted outcomes, win rates, average IPC loss, average rounds).

**`battle.py`** — One battle. Sequence per round: AAA fire → target strikes (first round only) → submarine surprise strikes → main combat → casualty settlement → retreat check. Handles early termination (planes-only stalemate, lone sub, lone transport).

**`player.py`** — `Attacker` and `Defender` subclasses of `Player`. Manages unit counts, applies tech upgrades, resolves casualties in order-of-loss priority, computes dice via `BattleBoard`. `Attacker` handles artillery/tactical boosts and paratrooper landing. `Defender` handles AAA rolls and cruiser boost.

**`units.py`** — All unit classes inherit from `Unit`. `Abbr` is an `Enum` whose values are the class names (e.g., `Abbr.FTR == 'Fighter'`), so unit dict keys are always class name strings. `defaultUnits(role)` builds the full unit dictionary; `emptyUnits(unitDict)` initializes counts to `0` (or `[]` for `AirTransport`).

**`config.py`** — Unit category sets (`PLANES`, `LANDUNITS`, `SHIPUNITS`, etc.) and submarine target priority orders used throughout combat logic.

**`lib.py`** — All enums: `Tag`, `Role`, `PlayerState`, `EndCondition`, `Tech`, `Stalemate`.

**`utils.py`** — `Dice.roll`, `BattleBoard` (applies boosts, builds dice/tag arrays), `HitRecord` (tracks casualty reassignment), `parseCasualties` / `formatUnits` / `combineUnits`.

**`store.py`** — PostgreSQL logging (Supabase). Logs each request's IP/agent/referer and each response's output hash + JSON. Failures are silent (print only) so they never block a response.

**`encoder.py`** — MD5 `dictHash` for outcome deduplication in `Simulation`; SHA256 `JSONHash` for output versioning in `store.py`.

## Key Invariants

- **`AirTransport` is a list, not an int.** `units[Abbr.ATPT]` is a list of cargo pairs. It is special-cased in `getIpcValueUnits`, `isEmptyUnit`, `formatUnits`, and `combineUnits`. Everything else uses integer counts.

- **Capital ships have a `downgrade` attribute** (e.g., `Battleship.downgrade = 'DamagedBattleship'`). When a capital ship takes a hit, the damaged variant is added. `parseCasualties` collapses the chain back to the root for reporting.

- **`SSSUB` is a transient state.** During surprise strike phase, live subs are swapped to `SSSUB` so they are excluded from the main combat dice roll (`getDice` skips `SSSUB`). They are swapped back in `revertSurpriseStrikeSubs` before `settleCombat`.

- **`Tech` enum values are integers 0–9**, matching what the frontend sends directly. `Tech.NONE = 9`.

- **`version` in `.env` is appended to the output JSON before hashing** in `logOutputs`. Bump `version` to invalidate cached results in the database.

- **CORS is hardcoded to `https://www.bbr40.com`**. The local dev origin (`http://localhost:3000`) is commented out in `main.py`.

## Tests

`test/test.py` has a `TESTS` dict with boolean flags to enable verbose debug output at each battle phase (`start`, `round`, `preCombatUnits`, `combatHitSummary`, etc.). Toggle these to debug specific combat scenarios. Test fixture JSONs are in `test/inputs/00N.json`.
