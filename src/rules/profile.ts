import type { BattleState, TechId, Unit, UnitType } from '../engine/state.js';
import { UNIT_PROFILES } from '../profiles/units.js';
import { TECH_EFFECTS } from '../profiles/tech.js';

export type ResolvedProfile = Readonly<{
  attack: number;
  defense: number;
  move: number;
  hp: number;
  cost: number;
  attackDice: readonly number[];
  aaaShotsPerUnit: number;
  aaaThreshold: number;
  bombardValue: number;
  canShoreBombard: boolean;
  isCapitalShip: boolean;
  isSubmarine: boolean;
  isTransport: boolean;
  isAir: boolean;
  isStrategicBomber: boolean;
  isTacticalBomber: boolean;
  isDestroyer: boolean;
  isAAA: boolean;
}>;

/** Resolves effective stats for a unit given the owning side's techs and current hp. */
export function resolveProfile(unit: Unit, tech: ReadonlySet<TechId>): ResolvedProfile {
  const base = UNIT_PROFILES[unit.type];

  let attack = base.attack;
  let defense = base.defense;
  let move = base.move;
  let hp = base.hp;
  let cost = base.cost;
  let attackDice = base.attackDice;
  let aaaShotsPerUnit = base.aaaShotsPerUnit;
  let aaaThreshold = 1;
  let bombardValue = base.bombardValue;

  // Apply tech overlays
  for (const techId of tech) {
    const effect = TECH_EFFECTS[techId];
    const override = effect.unitOverrides?.[unit.type];
    if (!override) continue;

    if (override.attack !== undefined) {
      attack = override.attack;
      // Keep attackDice in sync for single-die units
      if (attackDice.length === 1) attackDice = [override.attack];
    }
    if (override.defense !== undefined) defense = override.defense;
    if (override.move !== undefined) move = override.move;
    if (override.hp !== undefined) hp = override.hp;
    if (override.cost !== undefined) cost = override.cost;
    if (override.attackDice !== undefined) attackDice = override.attackDice;
    if (override.aaaThreshold !== undefined) aaaThreshold = override.aaaThreshold;
    if (override.aaaShotsPerUnit !== undefined) aaaShotsPerUnit = override.aaaShotsPerUnit;
    if (override.bombardValue !== undefined) bombardValue = override.bombardValue;
  }

  // Apply RadarATC: AAA units fire at ≤2
  if (base.isAAA && tech.has('RadarATC')) {
    aaaThreshold = 2;
  }

  // Apply damage halving for capital ships
  if (base.isCapitalShip && unit.hpTaken > 0) {
    const isSuperBattleship = unit.type === 'Battleship' && tech.has('SuperBattleships');
    const isSuperCarrier = unit.type === 'AircraftCarrier' && tech.has('SuperCarriers');
    const fullyOperationalAt1Hit = isSuperBattleship || isSuperCarrier;

    const isDamaged = fullyOperationalAt1Hit ? unit.hpTaken >= 2 : unit.hpTaken >= 1;

    if (isDamaged) {
      attack = Math.floor(attack / 2);
      defense = Math.floor(defense / 2);
      move = Math.floor(move / 2);
      // Halve each die in attackDice
      attackDice = attackDice.map(d => Math.floor(d / 2));
      // Damaged capital ships lose AAA
      aaaShotsPerUnit = 0;
    }
  }

  return {
    attack,
    defense,
    move,
    hp,
    cost,
    attackDice,
    aaaShotsPerUnit,
    aaaThreshold,
    bombardValue,
    canShoreBombard: base.canShoreBombard,
    isCapitalShip: base.isCapitalShip,
    isSubmarine: base.isSubmarine,
    isTransport: base.isTransport,
    isAir: base.isAir,
    isStrategicBomber: base.isStrategicBomber,
    isTacticalBomber: base.isTacticalBomber,
    isDestroyer: base.isDestroyer,
    isAAA: base.isAAA,
  };
}

/** Convenience: resolve for a unit type at base (no tech, no damage). */
export function resolveBaseProfile(type: UnitType): ResolvedProfile {
  const fakeUnit: Unit = {
    id: '__base__',
    type,
    owner: '',
    hpTaken: 0,
    tags: new Set(),
    usedTargetSelect: false,
    isBombarding: false,
    firedInStep2: false,
    submerged: false,
  };
  return resolveProfile(fakeUnit, new Set());
}

/** Returns effective attack value (handles StrategicBomber multi-dice by max). */
export function effectiveAttack(unit: Unit, tech: ReadonlySet<TechId>): number {
  const p = resolveProfile(unit, tech);
  return p.attack;
}

/** Returns effective defense value. */
export function effectiveDefense(unit: Unit, tech: ReadonlySet<TechId>, state: BattleState): number {
  const side = state.attacker.units.some(u => u.id === unit.id)
    ? state.attacker
    : state.defender;
  const p = resolveProfile(unit, side.tech);
  return p.defense;
}
