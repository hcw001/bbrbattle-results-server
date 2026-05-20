import type { BattleState, StepResult, Unit } from '../engine/state.js';
import type { Event } from '../engine/events.js';
import { resolveProfile } from '../rules/profile.js';
import { isAtFinalHit, isDamaged } from '../rules/capitalShip.js';

/**
 * Step 1 — Place units on the battle board.
 *
 * Re-evaluates capital ship damage states at the start of each round.
 * Emits CapitalShipDamaged events when a capital ship transitions to
 * its halved-stat state.
 */
export function step1Place(state: BattleState): StepResult {
  const events: Event[] = [];

  function reevalSide(side: typeof state.attacker): typeof state.attacker {
    const updatedUnits = side.units.map(unit => {
      const p = resolveProfile(unit, side.tech);
      if (!p.isCapitalShip) return unit;

      if (isDamaged(unit, side.tech)) {
        events.push({
          kind: 'CapitalShipDamaged',
          unitId: unit.id,
          hpTaken: unit.hpTaken,
          newAttack: p.attack,
          newDefense: p.defense,
        });
      }
      return unit;
    });

    return { ...side, units: updatedUnits };
  }

  const newState: BattleState = {
    ...state,
    attacker: reevalSide(state.attacker),
    defender: reevalSide(state.defender),
  };

  return { state: newState, events };
}
