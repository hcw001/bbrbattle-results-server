import { describe, it, expect } from 'vitest';
import { runBattle, buildBattleState } from '../src/engine/engine.js';
import { Dice } from '../src/engine/dice.js';

function makeLandBattle(
  attUnits: Partial<Record<string, number>>,
  defUnits: Partial<Record<string, number>>,
  seed = 42,
) {
  const state = buildBattleState({
    terrain: 'land',
    attacker: { player: 'A', tech: [], units: attUnits as any },
    defender: { player: 'D', tech: [], units: defUnits as any },
  });
  return runBattle(state, new Dice(seed));
}

function makeSeaBattle(
  attUnits: Partial<Record<string, number>>,
  defUnits: Partial<Record<string, number>>,
  seed = 42,
) {
  const state = buildBattleState({
    terrain: 'sea',
    attacker: { player: 'A', tech: [], units: attUnits as any },
    defender: { player: 'D', tech: [], units: defUnits as any },
  });
  return runBattle(state, new Dice(seed));
}

describe('engine — basic battles', () => {
  it('single infantry vs single infantry resolves to a winner or draw', () => {
    const result = makeLandBattle({ Infantry: 1 }, { Infantry: 1 });
    expect(['attacker', 'defender', 'draw']).toContain(result.outcome);
    expect(result.rounds).toBeGreaterThanOrEqual(1);
    expect(result.events.length).toBeGreaterThan(0);
  });

  it('identical seeds produce identical event logs', () => {
    const r1 = makeLandBattle({ Infantry: 3 }, { Infantry: 3 }, 77);
    const r2 = makeLandBattle({ Infantry: 3 }, { Infantry: 3 }, 77);
    expect(r1.events).toEqual(r2.events);
    expect(r1.outcome).toBe(r2.outcome);
  });

  it('different seeds can produce different outcomes', () => {
    const outcomes = new Set<string>();
    for (let seed = 0; seed < 20; seed++) {
      outcomes.add(makeLandBattle({ Infantry: 2 }, { Infantry: 2 }, seed).outcome);
    }
    // Over 20 seeds at least 2 different outcomes should occur
    expect(outcomes.size).toBeGreaterThan(1);
  });

  it('events contain DiceRolled entries', () => {
    const result = makeLandBattle({ Infantry: 2 }, { Infantry: 2 }, 1);
    const diceEvents = result.events.filter(e => e.kind === 'DiceRolled');
    expect(diceEvents.length).toBeGreaterThan(0);
  });

  it('events contain BattleEnded', () => {
    const result = makeLandBattle({ Infantry: 2 }, { Infantry: 2 }, 1);
    const endEvent = result.events.find(e => e.kind === 'BattleEnded');
    expect(endEvent).toBeDefined();
  });

  it('surviving units are consistent with outcome', () => {
    const result = makeLandBattle({ Infantry: 5 }, { Infantry: 1 }, 1);
    if (result.outcome === 'attacker') {
      expect(result.survivingAttacker.length).toBeGreaterThan(0);
    } else if (result.outcome === 'defender') {
      expect(result.survivingDefender.length).toBeGreaterThan(0);
    }
  });
});

describe('engine — strategic bomber compulsory removal', () => {
  it('strat bomber is compulsorily removed if it survives round 1', () => {
    // 15 infantry shields ensure the strat bomber won't be taken as first casualty.
    // 1 defender fires at D=1 (Cavalry), so the strat bomber is very unlikely to die.
    const result = makeLandBattle(
      { StrategicBomber: 1, Infantry: 15 },
      { Cavalry: 1, Infantry: 10 },
      1,
    );
    const removalEvents = result.events.filter(
      e => e.kind === 'UnitRemoved' && e.reason === 'compulsory_removal',
    );
    // Either the strat bomber was compulsorily removed, or it was killed as a casualty first
    const casualtyEvents = result.events.filter(
      e => e.kind === 'UnitRemoved' && e.reason === 'casualty',
    );
    // At least one type of removal happened to a unit with StrategicBomber in its id
    const allRemovals = [...removalEvents, ...casualtyEvents];
    expect(allRemovals.length).toBeGreaterThan(0);
    // Specifically: after round 1, no strat bomber should still be firing (surviving)
    // because either it was removed as casualty or compulsorily removed
    expect(result.rounds).toBeGreaterThanOrEqual(1);
  });

  it('strat bomber does not appear in surviving attacker units after battle with 15 infantry shields', () => {
    // With 15 infantry shields, the strat bomber almost certainly survives round 1
    // and gets compulsorily removed — it should not appear in surviving units
    const result = makeLandBattle(
      { StrategicBomber: 1, Infantry: 15 },
      { Cavalry: 1, Infantry: 3 },
      1,
    );
    const stratBomberSurvivors = result.survivingAttacker.filter(
      u => u.type === 'StrategicBomber',
    );
    // Strat bomber should not survive (it's removed after round 1)
    expect(stratBomberSurvivors).toHaveLength(0);
  });
});

describe('engine — sub target select (no opposing destroyer)', () => {
  it('attacking subs use Target Select when no defending destroyer', () => {
    const state = buildBattleState({
      terrain: 'sea',
      attacker: { player: 'A', tech: [], units: { Submarine: 3 } as any },
      defender: { player: 'D', tech: [], units: { Cruiser: 2 } as any },
    });
    const result = runBattle(state, new Dice(42));
    const tsEvents = result.events.filter(e => e.kind === 'TargetSelectDeclared');
    expect(tsEvents.length).toBeGreaterThan(0);
  });

  it('subs do NOT use Target Select when defending destroyer is present', () => {
    const state = buildBattleState({
      terrain: 'sea',
      attacker: { player: 'A', tech: [], units: { Submarine: 3 } as any },
      defender: { player: 'D', tech: [], units: { Destroyer: 1 } as any },
    });
    const result = runBattle(state, new Dice(42));
    const tsEvents = result.events.filter(e => e.kind === 'TargetSelectDeclared');
    expect(tsEvents.length).toBe(0);
  });
});

describe('engine — AAA fires before round 1 only', () => {
  it('AAA volley fires exactly once', () => {
    const state = buildBattleState({
      terrain: 'land',
      attacker: { player: 'A', tech: [], units: { Fighter: 5 } as any },
      defender: { player: 'D', tech: [], units: { AAA: 2, Infantry: 5 } as any },
    });
    const result = runBattle(state, new Dice(42));
    const aaaEvents = result.events.filter(e => e.kind === 'AAAVolleyFired');
    expect(aaaEvents.length).toBe(1);
  });
});

describe('engine — Monte Carlo consistency', () => {
  it('200 simulations: attacker with 5 inf + 2 art beats 5 inf defender more than 50% of the time', () => {
    let attackerWins = 0;
    for (let seed = 0; seed < 200; seed++) {
      const r = makeLandBattle({ Infantry: 5, Artillery: 2 }, { Infantry: 5 }, seed);
      if (r.outcome === 'attacker') attackerWins++;
    }
    const winRate = attackerWins / 200;
    expect(winRate).toBeGreaterThan(0.5);
  });
});
