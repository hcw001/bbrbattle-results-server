import { describe, it, expect } from 'vitest';
import { resolveProfile } from '../src/rules/profile.js';
import { computeAAAPool } from '../src/rules/airDefense.js';
import { countCancelledSubs, getActiveSubmarines } from '../src/rules/submarines.js';
import { isDamaged, isAtFinalHit } from '../src/rules/capitalShip.js';
import { computePairings } from '../src/rules/combinedArms.js';
import type { BattleState, TechId, Unit } from '../src/engine/state.js';

function makeUnit(type: Unit['type'], hpTaken = 0, extra: Partial<Unit> = {}): Unit {
  return {
    id: `${type}_test`,
    type,
    owner: 'A',
    hpTaken,
    tags: new Set(),
    usedTargetSelect: false,
    isBombarding: false,
    firedInStep2: false,
    submerged: false,
    ...extra,
  };
}

const noTech = new Set<TechId>();

// ── Profile resolution ───────────────────────────────────────────────────────

describe('resolveProfile', () => {
  it('returns base stats for infantry with no tech', () => {
    const p = resolveProfile(makeUnit('Infantry'), noTech);
    expect(p.attack).toBe(1);
    expect(p.defense).toBe(2);
    expect(p.hp).toBe(1);
  });

  it('applies HeavyTanks tech to tanks', () => {
    const p = resolveProfile(makeUnit('Tank'), new Set<TechId>(['HeavyTanks']));
    expect(p.attack).toBe(4);
    expect(p.defense).toBe(3); // defense unchanged
  });

  it('applies JetFighters to fighters', () => {
    const p = resolveProfile(makeUnit('Fighter'), new Set<TechId>(['JetFighters']));
    expect(p.attack).toBe(4);
  });

  it('halves battleship at 1 hit (no SuperBattleships)', () => {
    const p = resolveProfile(makeUnit('Battleship', 1), noTech);
    expect(p.attack).toBe(2); // floor(4/2)
    expect(p.defense).toBe(2);
    expect(p.aaaShotsPerUnit).toBe(0); // damaged — no AAA
  });

  it('super battleship fully operational at 1 hit', () => {
    const p = resolveProfile(makeUnit('Battleship', 1), new Set<TechId>(['SuperBattleships']));
    expect(p.attack).toBe(4);
    expect(p.attackDice).toEqual([4, 2]);
    expect(p.aaaShotsPerUnit).toBe(3); // still operational
  });

  it('super battleship halved at 2 hits', () => {
    const p = resolveProfile(makeUnit('Battleship', 2), new Set<TechId>(['SuperBattleships']));
    expect(p.attackDice).toEqual([2, 1]); // floor(4/2)=2, floor(2/2)=1
    expect(p.aaaShotsPerUnit).toBe(0);
  });

  it('applies RadarATC to AAA threshold', () => {
    const p = resolveProfile(makeUnit('AAA'), new Set<TechId>(['RadarATC']));
    expect(p.aaaThreshold).toBe(2);
  });

  it('strategic bomber has 2 attack dice', () => {
    const p = resolveProfile(makeUnit('StrategicBomber'), noTech);
    expect(p.attackDice).toHaveLength(2);
    expect(p.attackDice[0]).toBe(2);
    expect(p.attackDice[1]).toBe(2);
  });

  it('heavy bombers upgrade strat bomber to 2@3', () => {
    const p = resolveProfile(makeUnit('StrategicBomber'), new Set<TechId>(['HeavyBombers']));
    expect(p.attackDice).toEqual([3, 3]);
  });
});

// ── Capital ship damage ──────────────────────────────────────────────────────

describe('capitalShip damage', () => {
  it('regular battleship is damaged at 1 hit', () => {
    expect(isDamaged(makeUnit('Battleship', 1), noTech)).toBe(true);
    expect(isDamaged(makeUnit('Battleship', 0), noTech)).toBe(false);
  });

  it('super battleship is damaged only at 2 hits', () => {
    const tech = new Set<TechId>(['SuperBattleships']);
    expect(isDamaged(makeUnit('Battleship', 1), tech)).toBe(false);
    expect(isDamaged(makeUnit('Battleship', 2), tech)).toBe(true);
  });

  it('regular battleship final hit at 2', () => {
    expect(isAtFinalHit(makeUnit('Battleship', 2), noTech)).toBe(true);
    expect(isAtFinalHit(makeUnit('Battleship', 1), noTech)).toBe(false);
  });

  it('super battleship final hit at 3', () => {
    const tech = new Set<TechId>(['SuperBattleships']);
    expect(isAtFinalHit(makeUnit('Battleship', 3), tech)).toBe(true);
    expect(isAtFinalHit(makeUnit('Battleship', 2), tech)).toBe(false);
  });
});

// ── AAA pool calculation ─────────────────────────────────────────────────────

describe('computeAAAPool', () => {
  it('1 AAA unit vs 5 fighters → 3 shots (min(3, 5))', () => {
    const sources = [makeUnit('AAA')];
    const { totalShots } = computeAAAPool(sources, noTech, 5);
    expect(totalShots).toBe(3);
  });

  it('2 AAA units vs 5 fighters → 5 shots (min(6, 5))', () => {
    const sources = [makeUnit('AAA'), makeUnit('AAA')];
    const { totalShots } = computeAAAPool(sources, noTech, 5);
    expect(totalShots).toBe(5);
  });

  it('1 battleship vs 2 fighters → 2 shots (min(3, 2))', () => {
    const sources = [makeUnit('Battleship')];
    const { totalShots } = computeAAAPool(sources, noTech, 2);
    expect(totalShots).toBe(2);
  });

  it('damaged battleship contributes 0 shots', () => {
    const sources = [makeUnit('Battleship', 1)]; // damaged — no AAA
    const { totalShots } = computeAAAPool(sources, noTech, 5);
    expect(totalShots).toBe(0);
  });

  it('super battleship AAA fires at threshold 2 with tech', () => {
    const tech = new Set<TechId>(['SuperBattleships']);
    const sources = [makeUnit('Battleship')];
    const { cappedShots } = computeAAAPool(sources, tech, 5);
    expect(cappedShots[0]?.threshold).toBe(2);
  });

  it('RadarATC raises AAA threshold to 2', () => {
    const tech = new Set<TechId>(['RadarATC']);
    const sources = [makeUnit('AAA')];
    const { cappedShots } = computeAAAPool(sources, tech, 5);
    expect(cappedShots[0]?.threshold).toBe(2);
  });

  it('0 attacking air → 0 shots', () => {
    const sources = [makeUnit('AAA')];
    const { totalShots } = computeAAAPool(sources, noTech, 0);
    expect(totalShots).toBe(0);
  });
});

// ── Submarine detection ──────────────────────────────────────────────────────

describe('submarine detection', () => {
  const makeSub = (id: string) => makeUnit('Submarine', 0, { id });

  it('no destroyers → 0 cancelled', () => {
    const subs = [makeSub('s1'), makeSub('s2')];
    expect(countCancelledSubs(subs, 0, false)).toBe(0);
  });

  it('1 destroyer, no super subs → all cancelled', () => {
    const subs = [makeSub('s1'), makeSub('s2'), makeSub('s3')];
    expect(countCancelledSubs(subs, 1, false)).toBe(3);
  });

  it('1 destroyer + super subs → 3 cancelled per destroyer', () => {
    const subs = [makeSub('s1'), makeSub('s2'), makeSub('s3'), makeSub('s4')];
    expect(countCancelledSubs(subs, 1, true)).toBe(3);
  });

  it('2 destroyers + super subs → 6 cancelled (cap)', () => {
    const subs = [makeSub('s1'), makeSub('s2')];
    expect(countCancelledSubs(subs, 2, true)).toBe(2); // min(6, 2)
  });

  it('getActiveSubmarines returns uncancelled subs', () => {
    const subs = [makeSub('s1'), makeSub('s2'), makeSub('s3'), makeSub('s4')];
    const active = getActiveSubmarines(subs, 1, true); // 3 cancelled, 1 active
    expect(active).toHaveLength(1);
    expect(active[0]?.id).toBe('s4');
  });
});

// ── Combined arms ────────────────────────────────────────────────────────────

describe('computePairings', () => {
  function makeState(
    attackerUnits: Unit[],
    defenderUnits: Unit[] = [],
    attackerTech: ReadonlySet<TechId> = noTech,
  ): BattleState {
    return {
      terrain: 'land',
      round: 1,
      aaaFired: false,
      flags: new Set(),
      attacker: {
        player: 'A',
        units: attackerUnits,
        tech: attackerTech,
        casualtyStrip: [],
        aaaFired: false,
      },
      defender: {
        player: 'D',
        units: defenderUnits,
        tech: noTech,
        casualtyStrip: [],
        aaaFired: false,
      },
    };
  }

  it('infantry + artillery → infantry attack boosted to 2', () => {
    const inf = makeUnit('Infantry', 0, { id: 'inf1' });
    const art = makeUnit('Artillery', 0, { id: 'art1' });
    const state = makeState([inf, art]);
    const bonuses = computePairings('attacker', 3, state);
    expect(bonuses.get('inf1')).toBe(2);
    expect(bonuses.has('art1')).toBe(false);
  });

  it('2 infantry + 1 artillery → only 1 infantry boosted', () => {
    const inf1 = makeUnit('Infantry', 0, { id: 'inf1' });
    const inf2 = makeUnit('Infantry', 0, { id: 'inf2' });
    const art = makeUnit('Artillery', 0, { id: 'art1' });
    const state = makeState([inf1, inf2, art]);
    const bonuses = computePairings('attacker', 3, state);
    const boosted = [...bonuses.entries()].filter(([, v]) => v === 2);
    expect(boosted).toHaveLength(1);
  });

  it('SelfPropelledArtillery supports 2 infantry per artillery', () => {
    const inf1 = makeUnit('Infantry', 0, { id: 'inf1' });
    const inf2 = makeUnit('Infantry', 0, { id: 'inf2' });
    const art = makeUnit('Artillery', 0, { id: 'art1' });
    const state = makeState([inf1, inf2, art], [], new Set<TechId>(['SelfPropelledArtillery']));
    const bonuses = computePairings('attacker', 3, state);
    expect(bonuses.get('inf1')).toBe(2);
    expect(bonuses.get('inf2')).toBe(2);
  });

  it('tac bomber that used TargetSelect forfeits combined arms', () => {
    const tac = makeUnit('TacticalBomber', 0, { id: 'tac1', usedTargetSelect: true });
    const ftr = makeUnit('Fighter', 0, { id: 'ftr1' });
    const state = makeState([tac, ftr]);
    const bonuses = computePairings('attacker', 3, state);
    expect(bonuses.has('tac1')).toBe(false);
  });

  it('cruiser + battleship (defending) → cruiser defense 4', () => {
    const cruiser = makeUnit('Cruiser', 0, { id: 'csr1' });
    const bb = makeUnit('Battleship', 0, { id: 'bts1' });
    const state = makeState([], [cruiser, bb]);
    const bonuses = computePairings('defender', 4, state);
    expect(bonuses.get('csr1')).toBe(4);
  });
});
