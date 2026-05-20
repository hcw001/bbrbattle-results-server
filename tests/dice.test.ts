import { describe, it, expect } from 'vitest';
import { Dice } from '../src/engine/dice.js';

describe('Dice', () => {
  it('produces values in [1, 6]', () => {
    const d = new Dice(42);
    for (let i = 0; i < 1000; i++) {
      const roll = d.roll();
      expect(roll).toBeGreaterThanOrEqual(1);
      expect(roll).toBeLessThanOrEqual(6);
    }
  });

  it('is deterministic — same seed produces same sequence', () => {
    const d1 = new Dice(999);
    const d2 = new Dice(999);
    for (let i = 0; i < 100; i++) {
      expect(d1.roll()).toBe(d2.roll());
    }
  });

  it('different seeds produce different sequences', () => {
    const d1 = new Dice(1);
    const d2 = new Dice(2);
    const r1 = Array.from({ length: 20 }, () => d1.roll());
    const r2 = Array.from({ length: 20 }, () => d2.roll());
    expect(r1).not.toEqual(r2);
  });

  it('rollN returns array of given length', () => {
    const d = new Dice(1);
    const rolls = d.rollN(6);
    expect(rolls).toHaveLength(6);
  });
});
