import type { TechId, Unit } from '../engine/state.js';
import { resolveProfile } from './profile.js';

export type AAASource = Readonly<{
  unit: Unit;
  shots: number;
  threshold: number;
}>;

/**
 * Computes the AAA volley parameters.
 *
 * Returns the list of sources (sorted by threshold descending so the
 * defender can greedily take highest-threshold shots first up to the cap),
 * the total shots capped by the number of attacking air units, and a
 * breakdown of which shots fire at which threshold.
 */
export function computeAAAPool(
  aaaSources: readonly Unit[],
  tech: ReadonlySet<TechId>,
  nAttackingAir: number,
): Readonly<{
  sources: readonly AAASource[];
  cappedShots: readonly { threshold: number; count: number }[];
  totalShots: number;
}> {
  if (nAttackingAir === 0) {
    return { sources: [], cappedShots: [], totalShots: 0 };
  }

  const sources: AAASource[] = aaaSources
    .filter(u => !u.isBombarding && u.hpTaken === 0) // damaged capital ships lose AAA
    .map(u => {
      const p = resolveProfile(u, tech);
      return {
        unit: u,
        shots: p.aaaShotsPerUnit,
        threshold: p.aaaThreshold,
      };
    })
    .filter(s => s.shots > 0);

  if (sources.length === 0) {
    return { sources: [], cappedShots: [], totalShots: 0 };
  }

  // Sort by threshold descending — defender wants highest-chance shots
  const sorted = [...sources].sort((a, b) => b.threshold - a.threshold);

  // Greedily fill up to nAttackingAir cap
  const cappedShots: { threshold: number; count: number }[] = [];
  let remaining = nAttackingAir;

  for (const src of sorted) {
    if (remaining <= 0) break;
    const take = Math.min(src.shots, remaining);
    cappedShots.push({ threshold: src.threshold, count: take });
    remaining -= take;
  }

  const totalShots = cappedShots.reduce((sum, s) => sum + s.count, 0);

  return { sources: sorted, cappedShots, totalShots };
}
