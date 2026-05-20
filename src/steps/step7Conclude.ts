import type { BattleState, Outcome, PlayerId } from '../engine/state.js';
import type { Event } from '../engine/events.js';
import type { StepResult } from '../engine/state.js';
import { resolveProfile } from '../rules/profile.js';

export type ConcludeResult = StepResult & {
  outcome: Outcome;
  capturedBy: PlayerId | null;
};

/**
 * Step 7 — Conclude combat.
 *
 * Determines the outcome (attacker/defender/draw) and capture logic.
 * Air-only attackers cannot capture a territory.
 */
export function step7Conclude(
  state: BattleState,
  retreated: boolean,
): ConcludeResult {
  const events: Event[] = [];

  const attackerUnits = state.attacker.units;
  const defenderUnits = state.defender.units;

  let outcome: Outcome;
  let capturedBy: PlayerId | null = null;

  if (retreated) {
    // Attacker retreated — defender holds
    outcome = 'defender';
  } else if (attackerUnits.length === 0 && defenderUnits.length === 0) {
    // Both wiped — draw; defender retains territory
    outcome = 'draw';
  } else if (attackerUnits.length === 0) {
    outcome = 'defender';
  } else if (defenderUnits.length === 0) {
    outcome = 'attacker';

    // Check if capture is possible (attacker needs at least one land unit for land battles)
    if (state.terrain === 'land') {
      const hasLandUnit = attackerUnits.some(u => {
        const p = resolveProfile(u, state.attacker.tech);
        return !p.isAir && !p.isSubmarine && !p.isTransport;
      });
      if (hasLandUnit) capturedBy = state.attacker.player;
    } else {
      capturedBy = state.attacker.player;
    }
  } else {
    // Both sides have units — shouldn't reach step 7 normally unless retreated
    outcome = 'defender';
  }

  events.push({ kind: 'BattleEnded', outcome, capturedBy });

  return { state, events, outcome, capturedBy };
}
