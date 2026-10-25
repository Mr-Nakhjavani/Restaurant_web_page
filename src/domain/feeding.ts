/**
 * "What is the cheapest way to feed N people?" — a covering knapsack over
 * complete-meal items that are orderable for the requested date/type.
 */

export interface FeedingCandidate {
  itemId: string;
  name: string;
  servesPeople: number;
  priceFils: number;
  maxQuantity: number;
}

export interface FeedingOption {
  totalFils: number;
  servings: number;
  lines: { itemId: string; name: string; quantity: number; servesPeople: number; lineTotalFils: number }[];
}

/** Cheapest combinations (up to `limit`) covering at least `guests` servings. */
export function cheapestCombinations(guests: number, candidates: FeedingCandidate[], limit = 3): FeedingOption[] {
  if (guests < 1 || candidates.length === 0) return [];
  const results: FeedingOption[] = [];
  const seen = new Set<string>();
  // Strategy 1: optimal DP over all candidates. Strategy 2: re-run excluding the
  // most-used item of previous answers to surface genuinely different options.
  let pool = [...candidates];
  for (let attempt = 0; attempt < limit * 2 && results.length < limit && pool.length > 0; attempt++) {
    const best = solve(guests, pool);
    if (!best) break;
    const key = best.lines.map((l) => `${l.itemId}x${l.quantity}`).sort().join(",");
    if (!seen.has(key)) {
      seen.add(key);
      results.push(best);
    }
    const dominant = [...best.lines].sort((a, b) => b.lineTotalFils - a.lineTotalFils)[0];
    pool = pool.filter((c) => c.itemId !== dominant.itemId);
  }
  return results.sort((a, b) => a.totalFils - b.totalFils);
}

function solve(guests: number, pool: FeedingCandidate[]): FeedingOption | null {
  const maxServe = Math.max(...pool.map((c) => c.servesPeople));
  const cap = guests + maxServe;
  // dp[s] = minimal cost to reach exactly s servings (bounded by maxQuantity per item)
  let dp: { cost: number; counts: Map<string, number> }[] = Array.from({ length: cap + 1 }, () => ({ cost: Infinity, counts: new Map() }));
  dp[0] = { cost: 0, counts: new Map() };
  for (const c of pool) {
    const next = dp.map((d) => ({ cost: d.cost, counts: d.counts }));
    for (let s = 0; s <= cap; s++) {
      if (dp[s].cost === Infinity) continue;
      for (let q = 1; q <= c.maxQuantity; q++) {
        const ns = s + q * c.servesPeople;
        if (ns > cap) break;
        const cost = dp[s].cost + q * c.priceFils;
        if (cost < next[ns].cost) {
          const counts = new Map(dp[s].counts);
          counts.set(c.itemId, (counts.get(c.itemId) ?? 0) + q);
          next[ns] = { cost, counts };
        }
      }
    }
    dp = next;
  }
  let best: { cost: number; counts: Map<string, number>; servings: number } | null = null;
  for (let s = guests; s <= cap; s++) {
    if (dp[s].cost < (best?.cost ?? Infinity)) best = { ...dp[s], servings: s };
  }
  if (!best || best.cost === Infinity) return null;
  const lines = [...best.counts.entries()].map(([itemId, quantity]) => {
    const c = pool.find((p) => p.itemId === itemId)!;
    return { itemId, name: c.name, quantity, servesPeople: c.servesPeople, lineTotalFils: quantity * c.priceFils };
  });
  return { totalFils: best.cost, servings: best.servings, lines };
}
