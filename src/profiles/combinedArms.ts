import type { UnitType } from '../engine/state.js';

export type CombinedArmsWhen = 'attack' | 'defense' | 'both';

export type CombinedArmsRule = Readonly<{
  /** Unit whose stat is boosted. */
  supported: UnitType;
  /** Unit providing the boost. */
  supporter: UnitType;
  /** Which stat is boosted. */
  stat: 'attack' | 'defense';
  /** New value for that stat. */
  boostedValue: number;
  /** When this pairing is active. */
  when: CombinedArmsWhen;
}>;

export const COMBINED_ARMS_RULES: readonly CombinedArmsRule[] = [
  // Infantry + Artillery → infantry attacks at 2
  { supported: 'Infantry', supporter: 'Artillery', stat: 'attack', boostedValue: 2, when: 'attack' },
  // Mech Infantry + Artillery → mech attacks at 2
  { supported: 'MechanizedInfantry', supporter: 'Artillery', stat: 'attack', boostedValue: 2, when: 'attack' },
  // Tactical Bomber + Tank → tac attacks at 4
  { supported: 'TacticalBomber', supporter: 'Tank', stat: 'attack', boostedValue: 4, when: 'attack' },
  // Tactical Bomber + Fighter → tac attacks at 4
  { supported: 'TacticalBomber', supporter: 'Fighter', stat: 'attack', boostedValue: 4, when: 'attack' },
  // Transport + Transport → one transport defends at 1 (handled specially in code)
  { supported: 'Transport', supporter: 'Transport', stat: 'defense', boostedValue: 1, when: 'defense' },
  // Battleship + Cruiser → cruiser defends at 4
  { supported: 'Cruiser', supporter: 'Battleship', stat: 'defense', boostedValue: 4, when: 'defense' },
];
