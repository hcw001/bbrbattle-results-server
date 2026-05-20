import type { BattleState } from '../engine/state.js';
import type { RetreatStrategy } from './types.js';

/** Default retreat strategy: never retreat. Attacker always presses on. */
export const defaultRetreatStrategy: RetreatStrategy = {
  name: 'never',
  shouldRetreat(_state: BattleState): boolean {
    return false;
  },
};
