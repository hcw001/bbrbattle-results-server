import type { BattleState, Side, Unit } from '../engine/state.js';
import type { Event } from '../engine/events.js';
import type { StepResult } from '../engine/state.js';
import type { Dice } from '../engine/dice.js';
import type { Strategies } from '../strategies/types.js';
import { resolveProfile } from '../rules/profile.js';
import { computePairings, getEffectiveAttack } from '../rules/combinedArms.js';
import { legalCasualties } from '../rules/casualtyTargeting.js';
import { isAtFinalHit } from '../rules/capitalShip.js';

const STEP = 3;

/**
 * Step 3 — Attacking units fire.
 * Also fires shore bombardment in round 1 of amphibious assaults.
 */
export function step3Attackers(
  state: BattleState,
  dice: Dice,
  strategies: Strategies,
): StepResult {
  const events: Event[] = [];

  // Compute combined arms bonuses for attackers
  const pairings = computePairings('attacker', STEP, state);

  // Units eligible to fire: active attacker units that didn't act in step 2
  const firingUnits = state.attacker.units.filter(u => !u.firedInStep2 && !u.submerged);

  // Shore bombardment (round 1 only — bombarding ships flagged with isBombarding)
  const bombarders = state.round === 1
    ? firingUnits.filter(u => u.isBombarding)
    : [];

  const normalFirers = firingUnits.filter(u => !u.isBombarding);

  let s = state;

  // Fire shore bombardment
  for (const bombUnit of bombarders) {
    const p = resolveProfile(bombUnit, s.attacker.tech);
    const rolls: { threshold: number; roll: number; hit: boolean }[] = [];
    let hits = 0;

    for (const threshold of p.attackDice.length > 0 ? p.attackDice : [p.bombardValue]) {
      const roll = dice.roll();
      const hit = roll <= threshold;
      rolls.push({ threshold, roll, hit });
      if (hit) hits++;
    }

    events.push({ kind: 'ShoreBombardmentFired', unitId: bombUnit.id, unitType: bombUnit.type, rolls });

    // Assign hits
    for (let i = 0; i < hits; i++) {
      s = assignHit(bombUnit, 'bombardment', s, strategies, events);
    }
  }

  // Fire normal attackers
  for (const unit of normalFirers) {
    const p = resolveProfile(unit, s.attacker.tech);
    const effectiveAttack = getEffectiveAttack(unit, pairings, s.attacker.tech);

    // Get the dice thresholds for this unit
    const thresholds = getAttackDiceThresholds(unit, effectiveAttack, p.attackDice, s.attacker.tech);

    for (const threshold of thresholds) {
      if (threshold === 0) continue; // AAA has attack 0
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

/** Resolves the dice thresholds to roll for a unit's attack. */
function getAttackDiceThresholds(
  unit: Unit,
  effectiveAttack: number,
  baseDice: readonly number[],
  tech: ReadonlySet<import('../engine/state.js').TechId>,
): readonly number[] {
  const p = resolveProfile(unit, tech);

  // Strategic bomber and units with multi-dice use their dice array directly
  // (combined arms doesn't apply to strat bombers)
  if (p.isStrategicBomber) return p.attackDice;

  // For units with a single die, use effectiveAttack (which includes CA bonus)
  return [effectiveAttack];
}

/** Assigns a hit from an attacker onto a defender casualty. */
function assignHit(
  source: Unit,
  reason: import('../engine/state.js').HitReason,
  state: BattleState,
  strategies: Strategies,
  events: Event[],
): BattleState {
  const eligible = legalCasualties(
    { source, reason },
    state.defender.units,
    state,
  );

  if (eligible.length === 0) return state;

  const chosen = strategies.defenderCasualty.choose(eligible, state, 'defender');

  events.push({ kind: 'HitAssigned', sourceId: source.id, targetId: chosen.id, reason });
  events.push({
    kind: 'CasualtyOptionsConsidered',
    hitFromId: source.id,
    eligibleIds: eligible.map(u => u.id),
    chosenId: chosen.id,
    strategy: strategies.defenderCasualty.name,
  });

  return applyHitToUnit(chosen, state, 'defender', events);
}

/** Applies a hit to a unit — moves to casualty strip if killed, or increments hpTaken. */
function applyHitToUnit(
  target: Unit,
  state: BattleState,
  targetSide: 'attacker' | 'defender',
  events: Event[],
): BattleState {
  const side = targetSide === 'defender' ? state.defender : state.attacker;
  const p = resolveProfile(target, side.tech);

  if (p.isCapitalShip && !isAtFinalHit(target, side.tech)) {
    // Capital ship takes a damage chip — not killed yet
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
    return targetSide === 'defender'
      ? { ...state, defender: newSide }
      : { ...state, attacker: newSide };
  }

  // Unit is killed — move to casualty strip (still fires in step 4)
  const newUnits = side.units.filter(u => u.id !== target.id);
  const newStrip = [...side.casualtyStrip, target];
  const newSide = { ...side, units: newUnits, casualtyStrip: newStrip };
  return targetSide === 'defender'
    ? { ...state, defender: newSide }
    : { ...state, attacker: newSide };
}
