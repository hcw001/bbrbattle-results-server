import type { BattleState, TechId, Unit } from '../engine/state.js';
import { COMBINED_ARMS_RULES } from '../profiles/combinedArms.js';
import { resolveProfile } from './profile.js';

type Step = 3 | 4;

/**
 * Computes attack/defense bonuses from combined arms for a firing side.
 *
 * Returns a Map<unitId, boostedStatValue> for units that receive a bonus.
 * Units not in the map fire at their base resolved stat.
 *
 * Called separately for step 3 (attackers) and step 4 (defenders).
 * Units on the casualty strip are included when computing pairings.
 */
export function computePairings(
  firingSide: 'attacker' | 'defender',
  step: Step,
  state: BattleState,
): Map<string, number> {
  const side = firingSide === 'attacker' ? state.attacker : state.defender;
  const stat = firingSide === 'attacker' ? 'attack' : 'defense';

  // All units available to the firing side (active + casualty strip)
  const allUnits = [...side.units, ...side.casualtyStrip];

  const bonuses = new Map<string, number>();

  for (const rule of COMBINED_ARMS_RULES) {
    if (rule.when !== 'both' && rule.when !== stat) continue;

    const supported = allUnits.filter(u => u.type === rule.supported);
    const supporters = allUnits.filter(u => u.type === rule.supporter);

    if (supported.length === 0 || supporters.length === 0) continue;

    // Transport + Transport special case: only ONE transport gets the buff
    if (rule.supported === 'Transport' && rule.supporter === 'Transport') {
      if (supported.length >= 2 && firingSide === 'defender') {
        const first = supported[0];
        if (first) bonuses.set(first.id, rule.boostedValue);
      }
      continue;
    }

    // Self-Propelled Artillery: artillery supports 2 units instead of 1
    const supportRatio = side.tech.has('SelfPropelledArtillery') &&
      rule.supporter === 'Artillery' ? 2 : 1;

    const availableSlots = supporters.length * supportRatio;

    // Tac bombers that used Target Select forfeit combined arms entirely
    const eligibleSupported = supported.filter(u => {
      if (rule.supported === 'TacticalBomber' && u.usedTargetSelect) return false;
      return true;
    });

    const pairsCount = Math.min(eligibleSupported.length, availableSlots);

    for (let i = 0; i < pairsCount; i++) {
      const unit = eligibleSupported[i];
      if (unit) bonuses.set(unit.id, rule.boostedValue);
    }
  }

  return bonuses;
}

/** Returns the effective attack for a unit, accounting for combined arms bonuses. */
export function getEffectiveAttack(
  unit: Unit,
  pairingBonuses: Map<string, number>,
  tech: ReadonlySet<TechId>,
): number {
  const bonus = pairingBonuses.get(unit.id);
  if (bonus !== undefined) return bonus;
  return resolveProfile(unit, tech).attack;
}

/** Returns the effective defense for a unit, accounting for combined arms bonuses. */
export function getEffectiveDefense(
  unit: Unit,
  pairingBonuses: Map<string, number>,
  tech: ReadonlySet<TechId>,
): number {
  const bonus = pairingBonuses.get(unit.id);
  if (bonus !== undefined) return bonus;
  return resolveProfile(unit, tech).defense;
}
