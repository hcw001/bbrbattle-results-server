import type { BattleState, HitReason, Unit } from '../engine/state.js';
import { resolveProfile } from './profile.js';

/**
 * Returns legal casualty targets for a hit.
 *
 * Enforces:
 * - Air units cannot hit submarines unless a friendly destroyer is in the battle.
 * - Submarines cannot hit air units (never).
 * - Transports are chosen last (last resort), except when a sub uses Target Select.
 * - Bombarding ships are immune to all casualties.
 */
export function legalCasualties(
  hit: { source: Unit; reason: HitReason },
  candidates: readonly Unit[],
  state: BattleState,
): readonly Unit[] {
  const attackerTech = state.attacker.tech;
  const defenderTech = state.defender.tech;

  // Determine if the source is on the attacker or defender side
  const sourceIsAttacker = state.attacker.units.some(u => u.id === hit.source.id) ||
    state.attacker.casualtyStrip.some(u => u.id === hit.source.id);

  const sourceTech = sourceIsAttacker ? attackerTech : defenderTech;
  const sourceProfile = resolveProfile(hit.source, sourceTech);

  // Does the firing side have a destroyer present?
  const firingAttacker = sourceIsAttacker ? state.attacker : state.defender;
  const firingDefender = sourceIsAttacker ? state.defender : state.attacker;
  const friendlyHasDestroyer = [...firingAttacker.units, ...firingAttacker.casualtyStrip]
    .some(u => resolveProfile(u, firingAttacker.tech).isDestroyer);

  let eligible = candidates.filter(target => {
    const targetTech = state.attacker.units.some(u => u.id === target.id) ||
      state.attacker.casualtyStrip.some(u => u.id === target.id)
      ? attackerTech
      : defenderTech;
    const targetProfile = resolveProfile(target, targetTech);

    // Bombarding ships are immune
    if (target.isBombarding) return false;

    // Subs can never hit air units
    if (sourceProfile.isSubmarine && targetProfile.isAir) return false;

    // Air units can only hit subs if a friendly destroyer is present
    if (sourceProfile.isAir && targetProfile.isSubmarine && !friendlyHasDestroyer) return false;

    return true;
  });

  if (eligible.length === 0) return [];

  // Transports are last resort — unless it's a sub Target Select
  const isSubTargetSelect = hit.reason === 'target_select' &&
    resolveProfile(hit.source, sourceTech).isSubmarine;

  if (!isSubTargetSelect) {
    const nonTransports = eligible.filter(u => {
      const t = state.attacker.units.some(x => x.id === u.id) ||
        state.attacker.casualtyStrip.some(x => x.id === u.id) ? attackerTech : defenderTech;
      return !resolveProfile(u, t).isTransport;
    });
    if (nonTransports.length > 0) eligible = nonTransports;
  }

  return eligible;
}

/** Returns true if the opponent side has at least one destroyer in active units. */
export function opponentHasDestroyer(
  subOwner: 'attacker' | 'defender',
  state: BattleState,
): boolean {
  const opponent = subOwner === 'attacker' ? state.defender : state.attacker;
  return opponent.units.some(u => resolveProfile(u, opponent.tech).isDestroyer);
}
