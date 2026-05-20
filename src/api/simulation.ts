import type { BattleState, Unit, UnitType } from '../engine/state.js';
import type { BattleResult } from '../engine/engine.js';
import { runBattle, buildBattleState } from '../engine/engine.js';
import { Dice } from '../engine/dice.js';
import { resolveProfile } from '../rules/profile.js';
import { UNIT_PROFILES } from '../profiles/units.js';
import type { BattleRequest, SimulateResponse, UnitCountMap } from './schemas.js';

/** Converts a unit array to a {type: count} map. */
export function toUnitCountMap(units: readonly Unit[], tech: ReadonlySet<import('../engine/state.js').TechId>): UnitCountMap {
  const map: Record<string, number> = {};
  for (const unit of units) {
    map[unit.type] = (map[unit.type] ?? 0) + 1;
  }
  return map as UnitCountMap;
}

/** Computes IPC lost for a side given initial unit counts and survivors. */
function computeIpcLost(
  initial: Partial<Record<UnitType, number>>,
  survivors: readonly Unit[],
): number {
  const survivorCounts: Record<string, number> = {};
  for (const u of survivors) {
    survivorCounts[u.type] = (survivorCounts[u.type] ?? 0) + 1;
  }

  let lost = 0;
  for (const [type, count] of Object.entries(initial) as [UnitType, number][]) {
    const survived = survivorCounts[type] ?? 0;
    const casualties = Math.max(0, count - survived);
    lost += casualties * UNIT_PROFILES[type].cost;
  }
  return lost;
}

/**
 * Runs a single deterministic battle from an API request.
 */
export function runSingleBattle(req: BattleRequest) {
  const seed = req.seed ?? Math.floor(Math.random() * 2 ** 32);
  const dice = new Dice(seed);

  const state = buildBattleState({
    terrain: req.terrain,
    attacker: {
      player: 'attacker',
      tech: req.attacker.tech,
      units: req.attacker.units as Partial<Record<UnitType, number>>,
    },
    defender: {
      player: 'defender',
      tech: req.defender.tech,
      units: req.defender.units as Partial<Record<UnitType, number>>,
    },
  });

  const subMap = req.subTargetAssignments
    ? new Map(Object.entries(req.subTargetAssignments))
    : undefined;
  const tacMap = req.tacTargetAssignments
    ? new Map(Object.entries(req.tacTargetAssignments))
    : undefined;

  const result = runBattle(state, dice, {}, subMap, tacMap);

  return {
    outcome: result.outcome,
    rounds: result.rounds,
    survivingAttacker: toUnitCountMap(result.survivingAttacker, state.attacker.tech),
    survivingDefender: toUnitCountMap(result.survivingDefender, state.defender.tech),
    ipcLost: {
      attacker: computeIpcLost(req.attacker.units as Partial<Record<UnitType, number>>, result.survivingAttacker),
      defender: computeIpcLost(req.defender.units as Partial<Record<UnitType, number>>, result.survivingDefender),
    },
    events: result.events,
  };
}

/**
 * Runs a Monte Carlo simulation.
 */
export function runSimulation(req: import('./schemas.js').SimulateRequest): SimulateResponse {
  const baseSeed = req.seed ?? Math.floor(Math.random() * 2 ** 32);
  const n = req.nIterations;

  let attackerWins = 0;
  let defenderWins = 0;
  let draws = 0;
  let totalRounds = 0;
  let totalAttackerIpc = 0;
  let totalDefenderIpc = 0;

  // Track outcome distributions
  const attackerOutcomes = new Map<string, { count: number; ipcLost: number; units: UnitCountMap }>();
  const defenderOutcomes = new Map<string, { count: number; ipcLost: number; units: UnitCountMap }>();

  const initialAttacker = req.attacker.units as Partial<Record<UnitType, number>>;
  const initialDefender = req.defender.units as Partial<Record<UnitType, number>>;

  for (let i = 0; i < n; i++) {
    const dice = new Dice(baseSeed + i);
    const state = buildBattleState({
      terrain: req.terrain,
      attacker: { player: 'attacker', tech: req.attacker.tech, units: initialAttacker },
      defender: { player: 'defender', tech: req.defender.tech, units: initialDefender },
    });

    const subMap = req.subTargetAssignments
      ? new Map(Object.entries(req.subTargetAssignments))
      : undefined;
    const tacMap = req.tacTargetAssignments
      ? new Map(Object.entries(req.tacTargetAssignments))
      : undefined;

    const result = runBattle(state, dice, {}, subMap, tacMap);

    if (result.outcome === 'attacker') attackerWins++;
    else if (result.outcome === 'defender') defenderWins++;
    else draws++;

    totalRounds += result.rounds;

    const attIpc = computeIpcLost(initialAttacker, result.survivingAttacker);
    const defIpc = computeIpcLost(initialDefender, result.survivingDefender);
    totalAttackerIpc += attIpc;
    totalDefenderIpc += defIpc;

    // Record outcome distributions
    const attKey = JSON.stringify(toUnitCountMap(result.survivingAttacker, state.attacker.tech));
    const defKey = JSON.stringify(toUnitCountMap(result.survivingDefender, state.defender.tech));

    const existing = attackerOutcomes.get(attKey);
    if (existing) {
      existing.count++;
      existing.ipcLost += attIpc;
    } else {
      attackerOutcomes.set(attKey, {
        count: 1,
        ipcLost: attIpc,
        units: toUnitCountMap(result.survivingAttacker, state.attacker.tech),
      });
    }

    const existingDef = defenderOutcomes.get(defKey);
    if (existingDef) {
      existingDef.count++;
      existingDef.ipcLost += defIpc;
    } else {
      defenderOutcomes.set(defKey, {
        count: 1,
        ipcLost: defIpc,
        units: toUnitCountMap(result.survivingDefender, state.defender.tech),
      });
    }
  }

  // Sort distributions by probability descending
  const attackerDist = [...attackerOutcomes.values()]
    .sort((a, b) => b.count - a.count)
    .map(v => ({ units: v.units, probability: v.count / n, ipcLost: v.ipcLost / v.count }));

  const defenderDist = [...defenderOutcomes.values()]
    .sort((a, b) => b.count - a.count)
    .map(v => ({ units: v.units, probability: v.count / n, ipcLost: v.ipcLost / v.count }));

  return {
    stats: {
      attackerWinRate: attackerWins / n,
      defenderWinRate: defenderWins / n,
      drawRate: draws / n,
      avgRounds: totalRounds / n,
      avgIpcLost: {
        attacker: totalAttackerIpc / n,
        defender: totalDefenderIpc / n,
      },
    },
    outcomeDistribution: {
      attacker: attackerDist,
      defender: defenderDist,
    },
  };
}
