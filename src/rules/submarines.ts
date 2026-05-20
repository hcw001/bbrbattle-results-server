import type { TechId, Unit } from '../engine/state.js';
import { resolveProfile } from './profile.js';

/**
 * Returns the number of submarines whose special abilities are cancelled
 * by opposing destroyers.
 *
 * Without Super Submarines: any destroyer cancels ALL sub abilities.
 * With Super Submarines: each destroyer cancels exactly 3 subs.
 */
export function countCancelledSubs(
  subs: readonly Unit[],
  opposingDestroyerCount: number,
  hasSuperSubmarines: boolean,
): number {
  if (opposingDestroyerCount === 0) return 0;
  if (!hasSuperSubmarines) return subs.length; // all cancelled
  const cap = 3 * opposingDestroyerCount;
  return Math.min(cap, subs.length);
}

/**
 * Returns the subs that retain full special abilities (Target Select / Surprise Strike / Submerge).
 */
export function getActiveSubmarines(
  subs: readonly Unit[],
  opposingDestroyerCount: number,
  hasSuperSubmarines: boolean,
): readonly Unit[] {
  const cancelled = countCancelledSubs(subs, opposingDestroyerCount, hasSuperSubmarines);
  return subs.slice(cancelled);
}

/** Counts destroyers in a unit list. */
export function countDestroyers(units: readonly Unit[], tech: ReadonlySet<TechId>): number {
  return units.filter(u => resolveProfile(u, tech).isDestroyer).length;
}
