import type { BattleState, Unit } from '../engine/state.js';

/** Picks which of the eligible units absorbs a hit. */
export interface CasualtyStrategy {
  name: string;
  choose(
    eligibleCasualties: readonly Unit[],
    state: BattleState,
    side: 'attacker' | 'defender',
  ): Unit;
}

/** Decides whether the attacker retreats at the end of a round. */
export interface RetreatStrategy {
  name: string;
  shouldRetreat(state: BattleState): boolean;
}

/** Decides whether a submarine submerges or acts in step 2. */
export interface SubmarineStrategy {
  name: string;
  shouldSubmerge(sub: Unit, state: BattleState, side: 'attacker' | 'defender'): boolean;
}

/** Provides target assignments for Target Select. Auto-generates if not supplied. */
export interface TargetSelectStrategy {
  name: string;
  /**
   * Returns a map of { firingUnitId → targetUnitId } for all eligible
   * subs / tac bombers.
   */
  getAssignments(
    eligibleFirers: readonly Unit[],
    validTargets: readonly Unit[],
    state: BattleState,
  ): ReadonlyMap<string, string>;
}

export type Strategies = Readonly<{
  attackerCasualty: CasualtyStrategy;
  defenderCasualty: CasualtyStrategy;
  retreat: RetreatStrategy;
  attackerSubTarget: TargetSelectStrategy;
  defenderSubSurprise: TargetSelectStrategy;
  tacTarget: TargetSelectStrategy;
}>;
