import type { TechId, UnitType } from '../engine/state.js';

export type TechEffect = Readonly<{
  /** Overrides for specific unit types. */
  unitOverrides?: Partial<
    Record<
      UnitType,
      Partial<{
        attack: number;
        defense: number;
        move: number;
        hp: number;
        cost: number;
        /** Override the attack dice array (e.g. super-BB rolls [4, 2]). */
        attackDice: readonly number[];
        /** Override AAA threshold for built-in AAA on this unit (default 1). */
        aaaThreshold: number;
        aaaShotsPerUnit: number;
        bombardValue: number;
      }>
    >
  >;
  /** Artillery supports 2 infantry instead of 1. */
  selfPropelledArtillery?: boolean;
  /** Super Submarines: destroyers detect only 3 subs each. */
  superSubmarines?: boolean;
  /** Improved Transports: transports defend at 1 individually. */
  improvedTransports?: boolean;
  /** Super Carriers: fully operational at 1 hit. */
  superCarriers?: boolean;
  /** Super Battleships: fully operational at 1 hit; roll 2 dice. */
  superBattleships?: boolean;
  /** Radar and ATC: AAA units hit ≤2 instead of ≤1. */
  radarATC?: boolean;
}>;

export const TECH_EFFECTS: Readonly<Record<TechId, TechEffect>> = {
  AdvancedMechanized: {
    // No combat impact per reference §6.1
  },

  SelfPropelledArtillery: {
    selfPropelledArtillery: true,
  },

  ImprovedTransports: {
    improvedTransports: true,
    unitOverrides: {
      Transport: { defense: 1 },
    },
  },

  SuperBattleships: {
    superBattleships: true,
    unitOverrides: {
      Battleship: {
        hp: 3,
        attackDice: [4, 2],
        aaaThreshold: 2,
      },
    },
  },

  SuperSubmarines: {
    superSubmarines: true,
    unitOverrides: {
      Submarine: { attack: 3 },
    },
  },

  HeavyBombers: {
    unitOverrides: {
      StrategicBomber: { attackDice: [3, 3] },
    },
  },

  JetFighters: {
    unitOverrides: {
      Fighter: { attack: 4 },
    },
  },

  SuperCarriers: {
    superCarriers: true,
    unitOverrides: {
      AircraftCarrier: { hp: 3 },
    },
  },

  ImprovedShipyards: {
    unitOverrides: {
      Submarine: { cost: 5 },
      Transport: { cost: 5 },
      Destroyer: { cost: 7 },
      Cruiser: { cost: 10 },
      AircraftCarrier: { cost: 13 },
      Battleship: { cost: 16 },
    },
  },

  HeavyTanks: {
    unitOverrides: {
      Tank: { attack: 4 },
    },
  },

  RadarATC: {
    radarATC: true,
  },
};
