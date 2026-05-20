import type { TechId, Unit } from '../engine/state.js';
import { resolveProfile } from './profile.js';

/**
 * Returns whether a capital ship is currently in its "damaged" (halved) state.
 *
 * Super Battleships and Super Carriers are fully operational at 1 hit;
 * damage begins at 2 hits. Regular capital ships are halved at 1 hit.
 */
export function isDamaged(unit: Unit, tech: ReadonlySet<TechId>): boolean {
  const p = resolveProfile(unit, tech);
  if (!p.isCapitalShip) return false;

  const isSuperBattleship = unit.type === 'Battleship' && tech.has('SuperBattleships');
  const isSuperCarrier = unit.type === 'AircraftCarrier' && tech.has('SuperCarriers');
  const fullyOperationalAt1 = isSuperBattleship || isSuperCarrier;

  return fullyOperationalAt1 ? unit.hpTaken >= 2 : unit.hpTaken >= 1;
}

/**
 * Returns whether a capital ship has taken its final hit (should be destroyed).
 */
export function isAtFinalHit(unit: Unit, tech: ReadonlySet<TechId>): boolean {
  const p = resolveProfile(unit, tech);
  if (!p.isCapitalShip) return false;
  return unit.hpTaken >= p.hp;
}

/**
 * Returns a new Unit with hpTaken incremented, or null if the unit is destroyed.
 * Caller is responsible for moving a destroyed capital ship to the casualty strip.
 */
export function applyHit(unit: Unit, tech: ReadonlySet<TechId>): Unit {
  return { ...unit, hpTaken: unit.hpTaken + 1 };
}

/**
 * Returns effective max HP for a capital ship given tech context.
 */
export function maxHp(unit: Unit, tech: ReadonlySet<TechId>): number {
  return resolveProfile(unit, tech).hp;
}
