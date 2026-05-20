import type { BattleState, Unit } from '../engine/state.js';
import type { Event } from '../engine/events.js';
import type { StepResult } from '../engine/state.js';
import type { Dice } from '../engine/dice.js';
import type { Strategies } from '../strategies/types.js';
import { resolveProfile } from '../rules/profile.js';
import { computePairings, getEffectiveDefense } from '../rules/combinedArms.js';
import { legalCasualties } from '../rules/casualtyTargeting.js';
import { isAtFinalHit } from '../rules/capitalShip.js';

const STEP = 4;

/**
 * Step 4 — Defending units fire (including units behind the casualty strip).
 *
 * Attacker removes casualties immediately.
 */
export function step4Defenders(
  state: BattleState,
  dice: Dice,
  strategies: Strategies,
): StepResult {
  const events: Event[] = [];

  const pairings = computePairings('defender', STEP, state);

  // All defending units fire — active units AND casualty strip (except step-2 firers)
  const firingUnits = [
    ...state.defender.units.filter(u => !u.firedInStep2 && !u.submerged),
    ...state.defender.casualtyStrip.filter(u => !u.firedInStep2),
  ];

  let s = state;

  for (const unit of firingUnits) {
    const p = resolveProfile(unit, s.defender.tech);
    const effectiveDefense = getEffectiveDefense(unit, pairings, s.defender.tech);

    if (effectiveDefense === 0) continue; // transports, AAA (which has D=1 but no fire in normal steps)

    // AAA has defense value 1 in normal combat — it fires as a casualty absorber
    // But AAA doesn't actively fire in step 4 per the reference — it's a casualty only
    if (p.isAAA) continue;

    const thresholds = p.isStrategicBomber ? [p.defense] : [effectiveDefense];

    for (const threshold of thresholds) {
      if (threshold === 0) continue;
      const roll = dice.roll();
      const hit = roll <= threshold;

      events.push({ kind: 'DiceRolled', step: STEP, round: s.round, unitId: unit.id, threshold, roll, hit });

      if (hit) {
        s = assignHit(unit, 'normal', s, strategies, events);
      }
    }
  }

  return { state: s, events };
}

function assignHit(
  source: Unit,
  reason: import('../engine/state.js').HitReason,
  state: BattleState,
  strategies: Strategies,
  events: Event[],
): BattleState {
  const eligible = legalCasualties(
    { source, reason },
    state.attacker.units,
    state,
  );

  if (eligible.length === 0) return state;

  const chosen = strategies.attackerCasualty.choose(eligible, state, 'attacker');

  events.push({ kind: 'HitAssigned', sourceId: source.id, targetId: chosen.id, reason });
  events.push({
    kind: 'CasualtyOptionsConsidered',
    hitFromId: source.id,
    eligibleIds: eligible.map(u => u.id),
    chosenId: chosen.id,
    strategy: strategies.attackerCasualty.name,
  });

  return applyHitToUnit(chosen, state, 'attacker', events);
}

function applyHitToUnit(
  target: Unit,
  state: BattleState,
  targetSide: 'attacker' | 'defender',
  events: Event[],
): BattleState {
  const side = targetSide === 'attacker' ? state.attacker : state.defender;
  const p = resolveProfile(target, side.tech);

  if (p.isCapitalShip && !isAtFinalHit(target, side.tech)) {
    const damaged = { ...target, hpTaken: target.hpTaken + 1 };
    events.push({
      kind: 'CapitalShipDamaged',
      unitId: damaged.id,
      hpTaken: damaged.hpTaken,
      newAttack: resolveProfile(damaged, side.tech).attack,
      newDefense: resolveProfile(damaged, side.tech).defense,
    });
    const updatedUnits = side.units.map(u => u.id === target.id ? damaged : u);
    const newSide = { ...side, units: updatedUnits };
    return targetSide === 'attacker'
      ? { ...state, attacker: newSide }
      : { ...state, defender: newSide };
  }

  // Attacker casualties are removed immediately in step 4
  const newUnits = side.units.filter(u => u.id !== target.id);
  const newSide = { ...side, units: newUnits };
  return targetSide === 'attacker'
    ? { ...state, attacker: newSide }
    : { ...state, defender: newSide };
}
