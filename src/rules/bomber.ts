import type { Unit } from '../engine/state.js';
import { resolveProfile } from './profile.js';

/**
 * Returns true if a strategic bomber must be compulsorily removed after round 1.
 *
 * Strategic bombers fight only round 1 in general combat. Any surviving
 * strat bomber is removed after round 1 completes — this is not a player choice.
 */
export function isCompulsoryRemoval(unit: Unit, round: number): boolean {
  return resolveProfile(unit, new Set()).isStrategicBomber && round > 1;
}

/**
 * Returns true if a unit can fight for more than 1 round.
 * Used to determine if defenseless-transport auto-destroy triggers.
 */
export function canFightMultipleRounds(unit: Unit): boolean {
  return !resolveProfile(unit, new Set()).isStrategicBomber;
}
