import type { Terrain, UnitType } from '../engine/state.js';

type Role = 'attacker' | 'defender';

export const CASUALTY_ORDER: Readonly<Record<Terrain, Readonly<Record<Role, readonly UnitType[]>>>> = {
  land: {
    attacker: [
      'StrategicBomber',
      'Infantry',
      'MechanizedInfantry',
      'Cavalry',
      'Artillery',
      'Tank',
      'Fighter',
      'TacticalBomber',
    ],
    defender: [
      'AAA',
      'Cavalry',
      'StrategicBomber',
      'Infantry',
      'MechanizedInfantry',
      'Artillery',
      'Tank',
      'TacticalBomber',
      'Fighter',
    ],
  },
  sea: {
    attacker: [
      'StrategicBomber',
      'AircraftCarrier', // free first hit (super) — still fully operational
      'AircraftCarrier', // free second hit (super at 1 hit)
      'AircraftCarrier', // regular carrier
      'AircraftCarrier', // regular carrier damaged
      'Submarine',
      'Destroyer',
      'Battleship',     // undamaged super BB (free hit)
      'Battleship',     // super BB at 1 hit (still operational)
      'Battleship',     // regular battleship
      'Fighter',
      'Cruiser',
      'TacticalBomber',
    ],
    defender: [
      'Submarine',
      'AircraftCarrier',
      'Destroyer',
      'Battleship',
      'TacticalBomber',
      'Cruiser',
      'Fighter',
    ],
  },
};

/** Transport is always last regardless of the order above. */
export const ALWAYS_LAST: readonly UnitType[] = ['Transport'];
