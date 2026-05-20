/** Mulberry32 seeded PRNG — produces values in [0, 1). */
function mulberry32(seed: number): () => number {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let z = Math.imul(s ^ (s >>> 15), 1 | s);
    z = (z + Math.imul(z ^ (z >>> 7), 61 | z)) ^ z;
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}

export class Dice {
  private readonly rng: () => number;
  private readonly _seed: number;

  constructor(seed: number) {
    this._seed = seed;
    this.rng = mulberry32(seed);
  }

  get seed(): number {
    return this._seed;
  }

  /** Roll a d6 — returns integer in [1, 6]. */
  roll(): number {
    return Math.floor(this.rng() * 6) + 1;
  }

  /** Roll multiple d6 at once. */
  rollN(n: number): readonly number[] {
    return Array.from({ length: n }, () => this.roll());
  }
}
