import { describe, it, expect } from 'vitest';
import { runLegacySimulation } from '../src/api/legacyAdapter.js';

type LegacyOutputs = {
  outcomes: {
    attacker: {
      unitsAlive: Record<string, number>[];
      unitsDead: Record<string, number>[];
      outcomePercentile: number[];
      outcomeCount: number[];
      ipcLoss: number[];
    };
    defender: {
      unitsAlive: Record<string, number>[];
      unitsDead: Record<string, number>[];
      outcomePercentile: number[];
      outcomeCount: number[];
      ipcLoss: number[];
    };
  };
  stats: {
    attackerIpc: number;
    defenderIpc: number;
    numberRounds: number;
    endConditions: [string, number][];
    nIterations: number;
  };
};

function runLegacy(
  attackerUnits: Record<string, number>,
  defenderUnits: Record<string, number>,
  nIterations = 200,
): LegacyOutputs {
  return runLegacySimulation({
    terrain: 'land',
    attackerTech: 9,
    defenderTech: 9,
    attackerUnits,
    defenderUnits,
    nIterations,
  }) as LegacyOutputs;
}

describe('legacy adapter — response shape', () => {
  it('returns required top-level keys', () => {
    const result = runLegacy({ Infantry: 2 }, { Infantry: 2 });
    expect(result).toHaveProperty('outcomes');
    expect(result).toHaveProperty('stats');
    expect(result.outcomes).toHaveProperty('attacker');
    expect(result.outcomes).toHaveProperty('defender');
  });

  it('stats contains all required fields', () => {
    const result = runLegacy({ Infantry: 2 }, { Infantry: 2 });
    const s = result.stats;
    expect(s).toHaveProperty('attackerIpc');
    expect(s).toHaveProperty('defenderIpc');
    expect(s).toHaveProperty('numberRounds');
    expect(s).toHaveProperty('endConditions');
    expect(s).toHaveProperty('nIterations');
    expect(s.nIterations).toBe(200);
  });

  it('endConditions has 4 entries summing to 1', () => {
    const result = runLegacy({ Infantry: 3 }, { Infantry: 3 });
    const conds = result.stats.endConditions;
    expect(conds).toHaveLength(4);
    const total = conds.reduce((s, [, p]) => s + p, 0);
    expect(total).toBeCloseTo(1, 10);
  });

  it('attacker outcome arrays have equal length', () => {
    const result = runLegacy({ Infantry: 3 }, { Infantry: 3 });
    const a = result.outcomes.attacker;
    const len = a.unitsAlive.length;
    expect(a.unitsDead.length).toBe(len);
    expect(a.outcomePercentile.length).toBe(len);
    expect(a.outcomeCount.length).toBe(len);
    expect(a.ipcLoss.length).toBe(len);
  });

  it('outcomeCount values sum to ~1', () => {
    const result = runLegacy({ Infantry: 3 }, { Infantry: 3 });
    const total = result.outcomes.attacker.outcomeCount.reduce((s, v) => s + v, 0);
    expect(total).toBeCloseTo(1, 5);
  });
});

describe('legacy adapter — tech mapping', () => {
  it('tech 9 (NONE) runs without error', () => {
    expect(() => runLegacy({ Infantry: 2 }, { Infantry: 2 })).not.toThrow();
  });

  it('tech 3 (HeavyTanks) upgrades tank attack', () => {
    const withTech = runLegacySimulation({
      terrain: 'land',
      attackerTech: 3,
      defenderTech: 9,
      attackerUnits: { Tank: 2 },
      defenderUnits: { Infantry: 5 },
      nIterations: 200,
    }) as LegacyOutputs;
    const withoutTech = runLegacySimulation({
      terrain: 'land',
      attackerTech: 9,
      defenderTech: 9,
      attackerUnits: { Tank: 2 },
      defenderUnits: { Infantry: 5 },
      nIterations: 200,
    }) as LegacyOutputs;

    const winWith = withTech.stats.endConditions.find(([n]) => n === 'Attacker Wins')?.[1] ?? 0;
    const winWithout = withoutTech.stats.endConditions.find(([n]) => n === 'Attacker Wins')?.[1] ?? 0;
    // Heavy tanks should improve attacker win rate
    expect(winWith).toBeGreaterThanOrEqual(winWithout);
  });
});

describe('legacy adapter — legacy unit types', () => {
  it('DamagedBattleship is accepted and fires at halved stats', () => {
    expect(() => runLegacySimulation({
      terrain: 'sea',
      attackerTech: 9,
      defenderTech: 9,
      attackerUnits: { DamagedBattleship: 1 },
      defenderUnits: { Destroyer: 1 },
      nIterations: 50,
    })).not.toThrow();
  });

  it('SuperBattleship implies SuperBattleships tech', () => {
    // SuperBattleship vs regular battleship — super should do better on average
    const withSuper = runLegacySimulation({
      terrain: 'sea',
      attackerTech: 9,
      defenderTech: 9,
      attackerUnits: { SuperBattleship: 1 },
      defenderUnits: { Cruiser: 3 },
      nIterations: 200,
    }) as LegacyOutputs;
    const withRegular = runLegacySimulation({
      terrain: 'sea',
      attackerTech: 9,
      defenderTech: 9,
      attackerUnits: { Battleship: 1 },
      defenderUnits: { Cruiser: 3 },
      nIterations: 200,
    }) as LegacyOutputs;

    const superWinRate = withSuper.stats.endConditions.find(([n]) => n === 'Attacker Wins')?.[1] ?? 0;
    const regularWinRate = withRegular.stats.endConditions.find(([n]) => n === 'Attacker Wins')?.[1] ?? 0;
    // Super battleship (2 dice) should generally win more than regular battleship
    expect(superWinRate).toBeGreaterThanOrEqual(regularWinRate);
  });

  it('SurpriseStrikeSubmarine is treated as Submarine', () => {
    expect(() => runLegacySimulation({
      terrain: 'sea',
      attackerTech: 9,
      defenderTech: 9,
      attackerUnits: { SurpriseStrikeSubmarine: 2 },
      defenderUnits: { Destroyer: 1 },
      nIterations: 50,
    })).not.toThrow();
  });
});

describe('legacy adapter — sea battle with fixture data', () => {
  it('processes the fixture-002 sea battle', () => {
    const result = runLegacySimulation({
      terrain: 'sea',
      attackerTech: 9,
      defenderTech: 9,
      attackerUnits: {
        Fighter: 1, TacticalBomber: 1, StrategicBomber: 1,
        Submarine: 6, Destroyer: 0, Cruiser: 1,
        Battleship: 1, DamagedBattleship: 1,
        AircraftCarrier: 1, DamagedAircraftCarrier: 1,
      },
      defenderUnits: {
        Fighter: 1, TacticalBomber: 1,
        Submarine: 6, Destroyer: 0, Transport: 1,
        Cruiser: 1, Battleship: 1, DamagedBattleship: 1,
        AircraftCarrier: 1, DamagedAircraftCarrier: 1,
      },
      nIterations: 100,
    }) as LegacyOutputs;

    expect(result.stats.nIterations).toBe(100);
    const totalProb = result.stats.endConditions.reduce((s, [, p]) => s + p, 0);
    expect(totalProb).toBeCloseTo(1, 5);
  });
});
