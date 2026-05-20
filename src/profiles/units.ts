import type { UnitType } from '../engine/state.js';

export type UnitRole = 'land' | 'air' | 'sea';

export type UnitProfile = Readonly<{
  cost: number;
  attack: number;
  defense: number;
  move: number;
  hp: number;
  role: UnitRole;
  /** Number of built-in AAA shots per unit (threshold determined by tech context). */
  aaaShotsPerUnit: number;
  canShoreBombard: boolean;
  bombardValue: number;
  isCapitalShip: boolean;
  isSubmarine: boolean;
  isTransport: boolean;
  isAir: boolean;
  isStrategicBomber: boolean;
  isTacticalBomber: boolean;
  isDestroyer: boolean;
  isAAA: boolean;
  /** Strategic bombers roll multiple dice on attack. */
  attackDice: readonly number[];
}>;

export const UNIT_PROFILES: Readonly<Record<UnitType, UnitProfile>> = {
  Infantry: {
    cost: 3, attack: 1, defense: 2, move: 1, hp: 1, role: 'land',
    aaaShotsPerUnit: 0, canShoreBombard: false, bombardValue: 0,
    isCapitalShip: false, isSubmarine: false, isTransport: false,
    isAir: false, isStrategicBomber: false, isTacticalBomber: false,
    isDestroyer: false, isAAA: false, attackDice: [1],
  },
  Artillery: {
    cost: 4, attack: 2, defense: 2, move: 1, hp: 1, role: 'land',
    aaaShotsPerUnit: 0, canShoreBombard: false, bombardValue: 0,
    isCapitalShip: false, isSubmarine: false, isTransport: false,
    isAir: false, isStrategicBomber: false, isTacticalBomber: false,
    isDestroyer: false, isAAA: false, attackDice: [2],
  },
  MechanizedInfantry: {
    cost: 4, attack: 1, defense: 2, move: 2, hp: 1, role: 'land',
    aaaShotsPerUnit: 0, canShoreBombard: false, bombardValue: 0,
    isCapitalShip: false, isSubmarine: false, isTransport: false,
    isAir: false, isStrategicBomber: false, isTacticalBomber: false,
    isDestroyer: false, isAAA: false, attackDice: [1],
  },
  Tank: {
    cost: 6, attack: 3, defense: 3, move: 2, hp: 1, role: 'land',
    aaaShotsPerUnit: 0, canShoreBombard: false, bombardValue: 0,
    isCapitalShip: false, isSubmarine: false, isTransport: false,
    isAir: false, isStrategicBomber: false, isTacticalBomber: false,
    isDestroyer: false, isAAA: false, attackDice: [3],
  },
  Cavalry: {
    cost: 4, attack: 2, defense: 1, move: 2, hp: 1, role: 'land',
    aaaShotsPerUnit: 0, canShoreBombard: false, bombardValue: 0,
    isCapitalShip: false, isSubmarine: false, isTransport: false,
    isAir: false, isStrategicBomber: false, isTacticalBomber: false,
    isDestroyer: false, isAAA: false, attackDice: [2],
  },
  AAA: {
    cost: 5, attack: 0, defense: 1, move: 1, hp: 1, role: 'land',
    aaaShotsPerUnit: 3, canShoreBombard: false, bombardValue: 0,
    isCapitalShip: false, isSubmarine: false, isTransport: false,
    isAir: false, isStrategicBomber: false, isTacticalBomber: false,
    isDestroyer: false, isAAA: true, attackDice: [],
  },
  Fighter: {
    cost: 10, attack: 3, defense: 4, move: 4, hp: 1, role: 'air',
    aaaShotsPerUnit: 0, canShoreBombard: false, bombardValue: 0,
    isCapitalShip: false, isSubmarine: false, isTransport: false,
    isAir: true, isStrategicBomber: false, isTacticalBomber: false,
    isDestroyer: false, isAAA: false, attackDice: [3],
  },
  TacticalBomber: {
    cost: 11, attack: 3, defense: 3, move: 4, hp: 1, role: 'air',
    aaaShotsPerUnit: 0, canShoreBombard: false, bombardValue: 0,
    isCapitalShip: false, isSubmarine: false, isTransport: false,
    isAir: true, isStrategicBomber: false, isTacticalBomber: true,
    isDestroyer: false, isAAA: false, attackDice: [3],
  },
  StrategicBomber: {
    cost: 12, attack: 2, defense: 1, move: 6, hp: 1, role: 'air',
    aaaShotsPerUnit: 0, canShoreBombard: false, bombardValue: 0,
    isCapitalShip: false, isSubmarine: false, isTransport: false,
    isAir: true, isStrategicBomber: true, isTacticalBomber: false,
    isDestroyer: false, isAAA: false,
    attackDice: [2, 2], // two dice each hitting ≤2
  },
  Submarine: {
    cost: 6, attack: 2, defense: 1, move: 2, hp: 1, role: 'sea',
    aaaShotsPerUnit: 0, canShoreBombard: false, bombardValue: 0,
    isCapitalShip: false, isSubmarine: true, isTransport: false,
    isAir: false, isStrategicBomber: false, isTacticalBomber: false,
    isDestroyer: false, isAAA: false, attackDice: [2],
  },
  Transport: {
    cost: 7, attack: 0, defense: 0, move: 2, hp: 1, role: 'sea',
    aaaShotsPerUnit: 0, canShoreBombard: false, bombardValue: 0,
    isCapitalShip: false, isSubmarine: false, isTransport: true,
    isAir: false, isStrategicBomber: false, isTacticalBomber: false,
    isDestroyer: false, isAAA: false, attackDice: [],
  },
  Destroyer: {
    cost: 8, attack: 2, defense: 2, move: 2, hp: 1, role: 'sea',
    aaaShotsPerUnit: 0, canShoreBombard: false, bombardValue: 0,
    isCapitalShip: false, isSubmarine: false, isTransport: false,
    isAir: false, isStrategicBomber: false, isTacticalBomber: false,
    isDestroyer: true, isAAA: false, attackDice: [2],
  },
  Cruiser: {
    cost: 12, attack: 3, defense: 3, move: 2, hp: 1, role: 'sea',
    aaaShotsPerUnit: 1, canShoreBombard: true, bombardValue: 3,
    isCapitalShip: false, isSubmarine: false, isTransport: false,
    isAir: false, isStrategicBomber: false, isTacticalBomber: false,
    isDestroyer: false, isAAA: false, attackDice: [3],
  },
  AircraftCarrier: {
    cost: 16, attack: 0, defense: 2, move: 2, hp: 2, role: 'sea',
    aaaShotsPerUnit: 0, canShoreBombard: false, bombardValue: 0,
    isCapitalShip: true, isSubmarine: false, isTransport: false,
    isAir: false, isStrategicBomber: false, isTacticalBomber: false,
    isDestroyer: false, isAAA: false, attackDice: [],
  },
  Battleship: {
    cost: 20, attack: 4, defense: 4, move: 2, hp: 2, role: 'sea',
    aaaShotsPerUnit: 3, canShoreBombard: true, bombardValue: 4,
    isCapitalShip: true, isSubmarine: false, isTransport: false,
    isAir: false, isStrategicBomber: false, isTacticalBomber: false,
    isDestroyer: false, isAAA: false, attackDice: [4],
  },
};
