import type { BattleState } from '../engine/state.js';
import type { Event } from '../engine/events.js';
import type { StepResult } from '../engine/state.js';

/**
 * Step 5 — Remove the defender's casualty strip.
 */
export function step5Remove(state: BattleState): StepResult {
  const events: Event[] = [];

  for (const unit of state.defender.casualtyStrip) {
    events.push({ kind: 'UnitRemoved', unitId: unit.id, reason: 'casualty' });
  }

  const newState: BattleState = {
    ...state,
    defender: {
      ...state.defender,
      casualtyStrip: [],
    },
  };

  return { state: newState, events };
}
