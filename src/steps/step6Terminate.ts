import type { BattleState } from '../engine/state.js';
import type { Event } from '../engine/events.js';
import type { StepResult } from '../engine/state.js';
import type { Strategies } from '../strategies/types.js';
import { resolveProfile } from '../rules/profile.js';
import { isCompulsoryRemoval } from '../rules/bomber.js';
import { canFightMultipleRounds } from '../rules/bomber.js';

export type TerminationResult = StepResult & {
  /** Whether the battle should end. */
  shouldEnd: boolean;
  /** Whether the attacker retreated. */
  retreated: boolean;
};

/**
 * Step 6 — Termination check.
 *
 * 1. Compulsory removal of strategic bombers after round 1.
 * 2. Check if either side has no combat units remaining.
 * 3. Check for defenseless-transport auto-destroy.
 * 4. Ask retreat strategy whether the attacker retreats.
 */
export function step6Terminate(
  state: BattleState,
  strategies: Strategies,
): TerminationResult {
  const events: Event[] = [];
  let s = state;

  // 1. Compulsory removal of strategic bombers — runs after each round completes.
  //    Strat bombers fight round 1 only. Remove survivors at the end of round 1 before round 2 starts.
  {
    const bombersToRemove = s.attacker.units.filter(u =>
      resolveProfile(u, s.attacker.tech).isStrategicBomber,
    );
    if (bombersToRemove.length > 0 && s.round === 1) {
      for (const b of bombersToRemove) {
        events.push({ kind: 'UnitRemoved', unitId: b.id, reason: 'compulsory_removal' });
      }
      const ids = new Set(bombersToRemove.map(u => u.id));
      s = {
        ...s,
        attacker: { ...s.attacker, units: s.attacker.units.filter(u => !ids.has(u.id)) },
      };
    }
  }

  // 2. Defenseless-transport auto-destroy
  const defenderUnitsNonTransport = s.defender.units.filter(
    u => !resolveProfile(u, s.defender.tech).isTransport,
  );
  const defenderOnlyTransports = s.defender.units.length > 0 && defenderUnitsNonTransport.length === 0;

  if (defenderOnlyTransports) {
    const attackerCanFightMultiple = s.attacker.units.some(u => canFightMultipleRounds(u));
    if (attackerCanFightMultiple) {
      // Auto-destroy all transports
      for (const t of s.defender.units) {
        events.push({ kind: 'UnitRemoved', unitId: t.id, reason: 'auto_destroy' });
      }
      s = { ...s, defender: { ...s.defender, units: [] } };
    }
  }

  // Reset firedInStep2 flags for next round
  s = resetFiredFlags(s);

  // Increment round
  s = { ...s, round: s.round + 1 };

  events.push({
    kind: 'RoundEnded',
    round: state.round, // original round number
    attackerCount: s.attacker.units.length,
    defenderCount: s.defender.units.length,
  });

  // 3. Check termination conditions
  const attackerCanFire = canSideFire(s.attacker);
  const defenderCanFire = canSideFire(s.defender);

  if (!attackerCanFire || !defenderCanFire) {
    return { state: s, events, shouldEnd: true, retreated: false };
  }

  // 4. Retreat check
  const retreated = strategies.retreat.shouldRetreat(s);
  if (retreated) {
    return { state: s, events, shouldEnd: true, retreated: true };
  }

  return { state: s, events, shouldEnd: false, retreated: false };
}

function canSideFire(side: BattleState['attacker']): boolean {
  return side.units.some(u => {
    const p = resolveProfile(u, side.tech);
    return !p.isAAA && (p.attack > 0 || p.defense > 0 || p.attackDice.length > 0);
  });
}

function resetFiredFlags(state: BattleState): BattleState {
  const resetUnits = (units: readonly import('../engine/state.js').Unit[]) =>
    units.map(u => ({ ...u, firedInStep2: false }));

  return {
    ...state,
    attacker: {
      ...state.attacker,
      units: resetUnits(state.attacker.units),
      casualtyStrip: [],
    },
    defender: {
      ...state.defender,
      units: resetUnits(state.defender.units),
      casualtyStrip: [],
    },
  };
}
