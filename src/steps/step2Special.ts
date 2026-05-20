import type { BattleState, Side, Unit } from '../engine/state.js';
import type { Event } from '../engine/events.js';
import type { StepResult } from '../engine/state.js';
import type { Dice } from '../engine/dice.js';
import type { Strategies } from '../strategies/types.js';
import { resolveProfile } from '../rules/profile.js';
import { computeAAAPool } from '../rules/airDefense.js';
import { getActiveSubmarines, countDestroyers } from '../rules/submarines.js';
import { legalCasualties } from '../rules/casualtyTargeting.js';
import { isDamaged } from '../rules/capitalShip.js';

const STEP = 2;

/** Returns all AAA sources for a defending side (AAA units + capital ships with built-in AAA). */
function collectAAASources(side: typeof state.defender, state: BattleState): Unit[] {
  return side.units.filter(u => {
    const p = resolveProfile(u, side.tech);
    // Damaged capital ships lose their built-in AAA
    if (p.isCapitalShip && isDamaged(u, side.tech)) return false;
    return p.aaaShotsPerUnit > 0;
  });
}

/**
 * Step 2 — Special actions: AAA volley, sub Target Select / Surprise Strike / Submerge,
 * tac bomber Target Select.
 *
 * Internal sequence:
 *   (a) AAA fires (round 1 only, before any sub actions)
 *   (b) Attacker declares sub Target Select targets
 *   (c) Attacker rolls sub Target Select dice — mark casualties
 *   (d) Defender rolls Surprise Strike dice — attacker picks those casualties
 *   (e) Remove all step-2 casualties
 *   (f) Tac bomber Target Select (round 1 only, negated if AAA fired)
 */
export function step2Special(
  state: BattleState,
  dice: Dice,
  strategies: Strategies,
  externalSubAssignments?: ReadonlyMap<string, string>,
  externalTacAssignments?: ReadonlyMap<string, string>,
): StepResult {
  const events: Event[] = [];
  let s = state;

  // ── (a) AAA volley (round 1 only) ───────────────────────────────────────
  let aaaFired = s.aaaFired;
  if (s.round === 1 && !aaaFired) {
    const attackingAir = s.attacker.units.filter(u => resolveProfile(u, s.attacker.tech).isAir);
    if (attackingAir.length > 0) {
      const sources = collectAAASources(s.defender, s);
      const { cappedShots, totalShots } = computeAAAPool(sources, s.defender.tech, attackingAir.length);

      if (totalShots > 0) {
        const casualtyIds: string[] = [];

        for (const { threshold, count } of cappedShots) {
          for (let i = 0; i < count; i++) {
            const roll = dice.roll();
            const hit = roll <= threshold;
            events.push({ kind: 'DiceRolled', step: STEP, round: s.round, unitId: 'aaa', threshold, roll, hit });

            if (hit && casualtyIds.length < attackingAir.length) {
              // Attacker chooses which air unit is hit — default: first available not yet chosen
              const notYetHit = attackingAir.filter(u => !casualtyIds.includes(u.id));
              const chosen = notYetHit[0];
              if (chosen) {
                casualtyIds.push(chosen.id);
                events.push({ kind: 'HitAssigned', sourceId: 'aaa', targetId: chosen.id, reason: 'aaa' });
              }
            }
          }
        }

        events.push({ kind: 'AAAVolleyFired', totalShots, hits: casualtyIds.length, casualtyIds });
        aaaFired = true;

        // Remove AAA casualties from attacker immediately
        if (casualtyIds.length > 0) {
          const remainingAttackers = s.attacker.units.filter(u => !casualtyIds.includes(u.id));
          s = { ...s, attacker: { ...s.attacker, units: remainingAttackers }, aaaFired: true };
        }
      }
    }
    s = { ...s, aaaFired: true };
  }

  // ── (b-e) Submarine actions ──────────────────────────────────────────────
  const attackerHasDestroyer = countDestroyers(s.defender.units, s.defender.tech) > 0;
  const defenderHasDestroyer = countDestroyers(s.attacker.units, s.attacker.tech) > 0;

  const attackingSubs = s.attacker.units.filter(u => resolveProfile(u, s.attacker.tech).isSubmarine);
  const defendingSubs = s.defender.units.filter(u => resolveProfile(u, s.defender.tech).isSubmarine);

  const activeAttackSubs = attackerHasDestroyer
    ? []
    : getActiveSubmarines(attackingSubs, 0, s.attacker.tech.has('SuperSubmarines'));

  const activeDefendSubs = defenderHasDestroyer
    ? []
    : getActiveSubmarines(defendingSubs, 0, s.defender.tech.has('SuperSubmarines'));

  // Track step-2 casualties (not removed until end)
  const step2CasualtyIds = new Set<string>();

  // (b/c) Attacker sub Target Select
  if (activeAttackSubs.length > 0) {
    const validTargets = s.defender.units.filter(u => {
      const p = resolveProfile(u, s.defender.tech);
      return !p.isAir; // subs cannot target air
    });

    const assignments = externalSubAssignments ??
      strategies.attackerSubTarget.getAssignments(activeAttackSubs, validTargets, s);

    for (const sub of activeAttackSubs) {
      const targetId = assignments.get(sub.id);
      if (!targetId) continue;

      const target = s.defender.units.find(u => u.id === targetId);
      if (!target || step2CasualtyIds.has(targetId)) {
        // Target already removed — hit wasted
        continue;
      }

      events.push({ kind: 'TargetSelectDeclared', unitId: sub.id, targetId, auto: !externalSubAssignments });

      const p = resolveProfile(sub, s.attacker.tech);
      const threshold = p.attack; // 2 base, 3 with SuperSubs
      const roll = dice.roll();
      const hit = roll <= threshold;

      events.push({ kind: 'DiceRolled', step: STEP, round: s.round, unitId: sub.id, threshold, roll, hit });

      if (hit) {
        events.push({ kind: 'HitAssigned', sourceId: sub.id, targetId, reason: 'target_select' });
        step2CasualtyIds.add(targetId);
      }

      // Mark sub as having fired in step 2
      s = markFiredInStep2(s, sub.id, 'attacker');
    }
  }

  // (d) Defender sub Surprise Strike — no pre-declaration; attacker picks casualty
  const activeDefendSubsAfterAttack = activeDefendSubs.filter(u => !step2CasualtyIds.has(u.id));
  for (const sub of activeDefendSubsAfterAttack) {
    const threshold = 1; // defense value 1 (no Super Sub upgrade for defense value)
    const roll = dice.roll();
    const hit = roll <= threshold;

    events.push({ kind: 'DiceRolled', step: STEP, round: s.round, unitId: sub.id, threshold, roll, hit });

    if (hit) {
      // Attacker picks casualty from their own units
      const eligible = legalCasualties({ source: sub, reason: 'surprise_strike' }, s.attacker.units, s);
      if (eligible.length > 0) {
        const chosen = strategies.attackerCasualty.choose(eligible, s, 'attacker');
        events.push({ kind: 'HitAssigned', sourceId: sub.id, targetId: chosen.id, reason: 'surprise_strike' });
        events.push({
          kind: 'CasualtyOptionsConsidered',
          hitFromId: sub.id,
          eligibleIds: eligible.map(u => u.id),
          chosenId: chosen.id,
          strategy: strategies.attackerCasualty.name,
        });
        step2CasualtyIds.add(chosen.id);
      }
    }

    s = markFiredInStep2(s, sub.id, 'defender');
  }

  // (e) Remove all step-2 casualties
  if (step2CasualtyIds.size > 0) {
    s = removeStep2Casualties(s, step2CasualtyIds, events);
  }

  // ── (f) Tac bomber Target Select (round 1 only, negated if AAA fired) ───
  if (s.round === 1 && !aaaFired) {
    const eligibleTacs = s.attacker.units.filter(u =>
      resolveProfile(u, s.attacker.tech).isTacticalBomber && !u.usedTargetSelect,
    );

    if (eligibleTacs.length > 0) {
      const validTargets = s.defender.units.filter(u => {
        const p = resolveProfile(u, s.defender.tech);
        return !p.isAir && !p.isTransport && !p.isSubmarine &&
          u.type !== 'Infantry' && u.type !== 'MechanizedInfantry';
      });

      const tacAssignments = externalTacAssignments ??
        strategies.tacTarget.getAssignments(eligibleTacs, validTargets, s);

      const tacCasualtyIds = new Set<string>();

      for (const tac of eligibleTacs) {
        const targetId = tacAssignments.get(tac.id);
        if (!targetId) continue;

        const target = s.defender.units.find(u => u.id === targetId);
        if (!target || tacCasualtyIds.has(targetId)) continue;

        events.push({ kind: 'TargetSelectDeclared', unitId: tac.id, targetId, auto: !externalTacAssignments });

        const roll = dice.roll();
        const threshold = 3; // tac Target Select always 3 (no combined arms)
        const hit = roll <= threshold;

        events.push({ kind: 'DiceRolled', step: STEP, round: s.round, unitId: tac.id, threshold, roll, hit });

        if (hit) {
          events.push({ kind: 'HitAssigned', sourceId: tac.id, targetId, reason: 'target_select' });
          tacCasualtyIds.add(targetId);
        }

        // Mark tac as having used Target Select — forfeits combined arms
        s = markUsedTargetSelect(s, tac.id);
        s = markFiredInStep2(s, tac.id, 'attacker');
      }

      if (tacCasualtyIds.size > 0) {
        const remaining = s.defender.units.filter(u => !tacCasualtyIds.has(u.id));
        for (const id of tacCasualtyIds) {
          events.push({ kind: 'UnitRemoved', unitId: id, reason: 'casualty' });
        }
        s = { ...s, defender: { ...s.defender, units: remaining } };
      }
    }
  }

  return { state: s, events };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function markFiredInStep2(state: BattleState, unitId: string, which: 'attacker' | 'defender'): BattleState {
  const side = which === 'attacker' ? state.attacker : state.defender;
  const updated = side.units.map(u =>
    u.id === unitId ? { ...u, firedInStep2: true } : u,
  );
  const newSide = { ...side, units: updated };
  return which === 'attacker'
    ? { ...state, attacker: newSide }
    : { ...state, defender: newSide };
}

function markUsedTargetSelect(state: BattleState, unitId: string): BattleState {
  const updated = state.attacker.units.map(u =>
    u.id === unitId ? { ...u, usedTargetSelect: true } : u,
  );
  return { ...state, attacker: { ...state.attacker, units: updated } };
}

function removeStep2Casualties(
  state: BattleState,
  casualtyIds: ReadonlySet<string>,
  events: Event[],
): BattleState {
  for (const id of casualtyIds) {
    events.push({ kind: 'UnitRemoved', unitId: id, reason: 'casualty' });
  }
  return {
    ...state,
    attacker: {
      ...state.attacker,
      units: state.attacker.units.filter(u => !casualtyIds.has(u.id)),
    },
    defender: {
      ...state.defender,
      units: state.defender.units.filter(u => !casualtyIds.has(u.id)),
    },
  };
}
