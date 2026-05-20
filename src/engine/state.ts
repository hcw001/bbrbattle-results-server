export type Terrain = 'land' | 'sea';
export type PlayerId = string;
export type Outcome = 'attacker' | 'defender' | 'draw';
export type HitReason = 'normal' | 'target_select' | 'surprise_strike' | 'aaa' | 'bombardment';

import type { Event } from './events.js';
export type { Event };

export type UnitType =
  | 'Infantry'
  | 'Artillery'
  | 'MechanizedInfantry'
  | 'Tank'
  | 'Cavalry'
  | 'AAA'
  | 'Fighter'
  | 'TacticalBomber'
  | 'StrategicBomber'
  | 'Submarine'
  | 'Transport'
  | 'Destroyer'
  | 'Cruiser'
  | 'AircraftCarrier'
  | 'Battleship';

export type TechId =
  | 'AdvancedMechanized'
  | 'SelfPropelledArtillery'
  | 'ImprovedTransports'
  | 'SuperBattleships'
  | 'SuperSubmarines'
  | 'HeavyBombers'
  | 'JetFighters'
  | 'SuperCarriers'
  | 'ImprovedShipyards'
  | 'HeavyTanks'
  | 'RadarATC';

export type Unit = Readonly<{
  id: string;
  type: UnitType;
  owner: PlayerId;
  hpTaken: number;
  tags: ReadonlySet<string>;
  /** Set when a tac bomber has used Target Select this battle — forfeits combined arms. */
  usedTargetSelect: boolean;
  /** Set on bombardment ships — immune to casualties. */
  isBombarding: boolean;
  /** Set when unit has fired in step 2 — cannot fire in steps 3/4. */
  firedInStep2: boolean;
  /** Set on submerged submarines. */
  submerged: boolean;
}>;

export type Side = Readonly<{
  player: PlayerId;
  units: readonly Unit[];
  tech: ReadonlySet<TechId>;
  casualtyStrip: readonly Unit[];
  aaaFired: boolean;
}>;

export type BattleState = Readonly<{
  terrain: Terrain;
  attacker: Side;
  defender: Side;
  round: number;
  /** True once AAA has fired (fires only before round 1). */
  aaaFired: boolean;
  flags: ReadonlySet<string>;
}>;

export type StepResult = Readonly<{
  state: BattleState;
  events: readonly Event[];
}>;

