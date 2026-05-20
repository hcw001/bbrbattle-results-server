import type { BattleState, Unit } from '../engine/state.js';
import type { CasualtyStrategy } from './types.js';
import { CASUALTY_ORDER, ALWAYS_LAST } from '../profiles/casualtyOrder.js';
import { resolveProfile } from '../rules/profile.js';

/**
 * Default order-of-loss strategy.
 *
 * Picks the first unit from the pre-defined static order, with transports
 * always appended last. Falls back to the first eligible unit if none match.
 */
export const defaultCasualtyStrategy: CasualtyStrategy = {
  name: 'default',

  choose(eligible, state, side): Unit {
    const terrain = state.terrain;
    const order = CASUALTY_ORDER[terrain][side];

    // Build a lookup: type → eligible units of that type
    const byType = new Map<string, Unit[]>();
    for (const unit of eligible) {
      const arr = byType.get(unit.type) ?? [];
      arr.push(unit);
      byType.set(unit.type, arr);
    }

    // Go through the order, pick first match
    for (const type of order) {
      const units = byType.get(type);
      if (units && units.length > 0) {
        const unit = units[0];
        if (unit) return unit;
      }
    }

    // Transports are last resort
    for (const type of ALWAYS_LAST) {
      const units = byType.get(type);
      if (units && units.length > 0) {
        const unit = units[0];
        if (unit) return unit;
      }
    }

    // Fallback: first eligible unit
    const first = eligible[0];
    if (!first) throw new Error('No eligible casualties');
    return first;
  },
};
