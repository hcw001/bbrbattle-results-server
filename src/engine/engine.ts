import type { BattleState, Outcome, PlayerId, TechId, Unit, UnitType } from './state.js';
import type { Event as BattleEvent } from './events.js';
import { Dice } from './dice.js';
import type { Strategies } from '../strategies/types.js';
import { defaultCasualtyStrategy } from '../strategies/casualty.js';
import { defaultRetreatStrategy } from '../strategies/retreat.js';
import {
  defaultSubTargetSelectStrategy,
  defaultSurpriseStrikeStrategy,
  defaultTacTargetSelectStrategy,
} from '../strategies/targetSelect.js';
import { step1Place } from '../steps/step1Place.js';
import { step2Special } from '../steps/step2Special.js';
import { step3Attackers } from '../steps/step3Attackers.js';
import { step4Defenders } from '../steps/step4Defenders.js';
import { step5Remove } from '../steps/step5Remove.js';
import { step6Terminate } from '../steps/step6Terminate.js';
import { step7Conclude } from '../steps/step7Conclude.js';
import { resolveProfile } from '../rules/profile.js';
import { UNIT_PROFILES } from '../profiles/units.js';

export type BattleResult = Readonly<{
  outcome: Outcome;
  rounds: number;
  survivingAttacker: readonly Unit[];
  survivingDefender: readonly Unit[];
  events: readonly BattleEvent[];
}>;

const DEFAULT_STRATEGIES: Strategies = {
  attackerCasualty: defaultCasualtyStrategy,
  defenderCasualty: defaultCasualtyStrategy,
  retreat: defaultRetreatStrategy,
  attackerSubTarget: defaultSubTargetSelectStrategy,
  defenderSubSurprise: defaultSurpriseStrikeStrategy,
  tacTarget: defaultTacTargetSelectStrategy,
};

const MAX_ROUNDS = 100; // safety cap to prevent infinite loops

/**
 * Runs a single battle to completion.
 *
 * @param initialState - The initial BattleState (units placed, tech set).
 * @param dice - Seeded PRNG.
 * @param strategies - Pluggable decision-makers; defaults to standard heuristics.
 * @param subAssignments - Pre-validated attacker sub Target Select map (unitId → targetId).
 * @param tacAssignments - Pre-validated tac bomber Target Select map.
 */
export function runBattle(
  initialState: BattleState,
  dice: Dice,
  strategies: Partial<Strategies> = {},
  subAssignments?: ReadonlyMap<string, string>,
  tacAssignments?: ReadonlyMap<string, string>,
): BattleResult {
  const strats: Strategies = { ...DEFAULT_STRATEGIES, ...strategies };
  const allEvents: BattleEvent[] = [];
  let state = initialState;
  let rounds = 0;
  let retreated = false;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    // Step 1: Place / re-eval damage states
    const r1 = step1Place(state);
    allEvents.push(...r1.events);
    state = r1.state;

    // Step 2: Special actions (AAA, sub TS/SS, tac TS)
    const r2 = step2Special(state, dice, strats, subAssignments, tacAssignments);
    allEvents.push(...r2.events);
    state = r2.state;

    // Step 3: Attacker fire
    const r3 = step3Attackers(state, dice, strats);
    allEvents.push(...r3.events);
    state = r3.state;

    // Step 4: Defender fire
    const r4 = step4Defenders(state, dice, strats);
    allEvents.push(...r4.events);
    state = r4.state;

    // Step 5: Remove defender casualties
    const r5 = step5Remove(state);
    allEvents.push(...r5.events);
    state = r5.state;

    // Step 6: Termination check
    const r6 = step6Terminate(state, strats);
    allEvents.push(...r6.events);
    state = r6.state;
    rounds = state.round - 1; // round was incremented in step6

    // Target assignments only apply to round 1
    subAssignments = undefined;
    tacAssignments = undefined;

    if (r6.shouldEnd) {
      retreated = r6.retreated;
      break;
    }
  }

  // Step 7: Conclude
  const r7 = step7Conclude(state, retreated);
  allEvents.push(...r7.events);

  return {
    outcome: r7.outcome,
    rounds,
    survivingAttacker: state.attacker.units,
    survivingDefender: state.defender.units,
    events: allEvents,
  };
}

/**
 * Runs a campaign: sequential battles where survivors of battle N
 * become the input force of battle N+1.
 */
export function runCampaign(
  battles: readonly BattleState[],
  dice: Dice,
  strategies: Partial<Strategies> = {},
): readonly BattleResult[] {
  const results: BattleResult[] = [];
  let attackerSurvivors: readonly Unit[] | undefined;

  for (const battleState of battles) {
    const state = attackerSurvivors
      ? { ...battleState, attacker: { ...battleState.attacker, units: attackerSurvivors } }
      : battleState;

    const result = runBattle(state, dice, strategies);
    results.push(result);
    attackerSurvivors = result.survivingAttacker;
  }

  return results;
}

// ── State construction helpers ───────────────────────────────────────────────

let _unitCounter = 0;

function nextId(type: UnitType): string {
  return `${type}_${_unitCounter++}`;
}

/**
 * Builds a BattleState from a simple unit-count map.
 * Used by the API layer.
 */
export function buildBattleState(input: {
  terrain: BattleState['terrain'];
  attacker: {
    player: PlayerId;
    tech: readonly TechId[];
    units: Partial<Record<UnitType, number>>;
    bombardingUnits?: Partial<Record<UnitType, number>>;
  };
  defender: {
    player: PlayerId;
    tech: readonly TechId[];
    units: Partial<Record<UnitType, number>>;
  };
}): BattleState {
  _unitCounter = 0; // reset for deterministic ids

  function buildUnits(
    unitMap: Partial<Record<UnitType, number>>,
    bombardMap: Partial<Record<UnitType, number>>,
    owner: PlayerId,
  ): readonly Unit[] {
    const units: Unit[] = [];

    for (const [type, count] of Object.entries(unitMap) as [UnitType, number][]) {
      for (let i = 0; i < count; i++) {
        units.push({
          id: nextId(type),
          type,
          owner,
          hpTaken: 0,
          tags: new Set(),
          usedTargetSelect: false,
          isBombarding: false,
          firedInStep2: false,
          submerged: false,
        });
      }
    }

    for (const [type, count] of Object.entries(bombardMap) as [UnitType, number][]) {
      for (let i = 0; i < count; i++) {
        units.push({
          id: nextId(type),
          type,
          owner,
          hpTaken: 0,
          tags: new Set(['bombarding']),
          usedTargetSelect: false,
          isBombarding: true,
          firedInStep2: false,
          submerged: false,
        });
      }
    }

    return units;
  }

  const attackerUnits = buildUnits(
    input.attacker.units,
    input.attacker.bombardingUnits ?? {},
    input.attacker.player,
  );
  const defenderUnits = buildUnits(input.defender.units, {}, input.defender.player);

  return {
    terrain: input.terrain,
    round: 1,
    aaaFired: false,
    flags: new Set(),
    attacker: {
      player: input.attacker.player,
      units: attackerUnits,
      tech: new Set(input.attacker.tech),
      casualtyStrip: [],
      aaaFired: false,
    },
    defender: {
      player: input.defender.player,
      units: defenderUnits,
      tech: new Set(input.defender.tech),
      casualtyStrip: [],
      aaaFired: false,
    },
  };
}
