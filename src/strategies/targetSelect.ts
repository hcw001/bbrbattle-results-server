import type { BattleState, Unit } from '../engine/state.js';
import type { TargetSelectStrategy } from './types.js';
import { resolveProfile } from '../rules/profile.js';

/**
 * Returns the priority order for attacking sub Target Select.
 * Highest-value targets first (surface warships before subs, subs before transports).
 */
function subTargetPriority(unit: Unit, tech: ReadonlySet<import('../engine/state.js').TechId>): number {
  const p = resolveProfile(unit, tech);
  if (p.isCapitalShip) return 0;
  if (p.isDestroyer) return 1;
  if (!p.isSubmarine && !p.isTransport && !p.isAir) return 2; // cruiser
  if (p.isSubmarine) return 3;
  if (p.isTransport) return 4;
  return 5;
}

/**
 * Auto-generates sub Target Select assignments.
 * Each eligible sub picks the highest-priority valid target.
 * Multiple subs may target the same unit (excess hits are lost per rules).
 */
export const defaultSubTargetSelectStrategy: TargetSelectStrategy = {
  name: 'auto-sub',

  getAssignments(firers, targets, state): ReadonlyMap<string, string> {
    const tech = state.defender.tech; // targets are on defender's side for attacking subs
    const sorted = [...targets].sort((a, b) =>
      subTargetPriority(a, tech) - subTargetPriority(b, tech),
    );

    const assignments = new Map<string, string>();
    const topTarget = sorted[0];
    if (!topTarget) return assignments;

    for (const firer of firers) {
      assignments.set(firer.id, topTarget.id);
    }
    return assignments;
  },
};

/**
 * Auto-generates defending sub Surprise Strike targets.
 * No pre-declaration — this strategy is a no-op (attacker picks casualty reactively).
 */
export const defaultSurpriseStrikeStrategy: TargetSelectStrategy = {
  name: 'auto-surprise-strike',
  getAssignments(_firers, _targets, _state): ReadonlyMap<string, string> {
    // Surprise Strike has no pre-declaration; handled in step2Special directly
    return new Map();
  },
};

/**
 * Auto-generates tac bomber Target Select assignments.
 * Each eligible tac bomber picks the highest-value valid target.
 */
export const defaultTacTargetSelectStrategy: TargetSelectStrategy = {
  name: 'auto-tac',

  getAssignments(firers, targets, state): ReadonlyMap<string, string> {
    const tech = state.defender.tech;
    const p = resolveProfile.bind(null);

    // Valid tac targets: not infantry, not air, not transport, not submarine
    const validTargets = targets.filter(t => {
      const tp = resolveProfile(t, tech);
      return !tp.isAir && !tp.isTransport && !tp.isSubmarine &&
        t.type !== 'Infantry' && t.type !== 'MechanizedInfantry';
    });

    if (validTargets.length === 0) return new Map();

    // Priority: capital ships > cruisers > destroyers
    const sorted = [...validTargets].sort((a, b) => {
      const ap = resolveProfile(a, tech);
      const bp = resolveProfile(b, tech);
      if (ap.isCapitalShip && !bp.isCapitalShip) return -1;
      if (!ap.isCapitalShip && bp.isCapitalShip) return 1;
      return bp.cost - ap.cost;
    });

    const assignments = new Map<string, string>();
    const topTarget = sorted[0];
    if (!topTarget) return assignments;

    for (const firer of firers) {
      assignments.set(firer.id, topTarget.id);
    }
    return assignments;
  },
};
