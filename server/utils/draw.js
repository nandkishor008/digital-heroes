/**
 * Draw engine.
 *
 * A player's ticket IS their score card: the five retained Stableford scores
 * (each 1-45) are the five numbers they play with. The monthly draw picks five
 * numbers from the same 1-45 range and a player's tier is how many of their
 * numbers appear in the winning set.
 *
 * Two selection methods, per the PRD:
 *   random      — uniform lottery-style selection
 *   algorithmic — weighted by how often each number appears across all entries
 */

const MIN_NUMBER = 1;
const MAX_NUMBER = 45;
const PICK_COUNT = 5;

const TIER_SHARE = { 5: 0.40, 4: 0.35, 3: 0.25 };
const ROLLS_OVER = { 5: true, 4: false, 3: false };

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/** Uniform selection of five distinct numbers. */
function pickRandom(count = PICK_COUNT) {
  const pool = [];
  for (let n = MIN_NUMBER; n <= MAX_NUMBER; n++) pool.push(n);
  const picked = [];
  for (let i = 0; i < count && pool.length; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked.sort((a, b) => a - b);
}

/** Frequency of every number across all submitted tickets. */
function frequencyMap(entries) {
  const freq = {};
  for (let n = MIN_NUMBER; n <= MAX_NUMBER; n++) freq[n] = 0;
  for (const entry of entries) {
    for (const n of entry.numbers || []) {
      if (freq[n] !== undefined) freq[n] += 1;
    }
  }
  return freq;
}

/**
 * Weighted selection without replacement. Weight = 1 + frequency, so numbers
 * players actually score are likelier to come up, while every number keeps a
 * non-zero chance.
 */
function pickAlgorithmic(entries, count = PICK_COUNT) {
  const freq = frequencyMap(entries);
  const candidates = Object.keys(freq).map((n) => ({ n: Number(n), w: 1 + freq[n] }));
  const picked = [];

  for (let i = 0; i < count && candidates.length; i++) {
    const total = candidates.reduce((sum, c) => sum + c.w, 0);
    let roll = Math.random() * total;
    let chosen = candidates.length - 1;
    for (let j = 0; j < candidates.length; j++) {
      roll -= candidates[j].w;
      if (roll <= 0) { chosen = j; break; }
    }
    picked.push(candidates.splice(chosen, 1)[0].n);
  }
  return picked.sort((a, b) => a - b);
}

/** How many of a ticket's numbers are in the winning set. Duplicates count once. */
function countMatches(numbers, winning) {
  const win = new Set(winning);
  const seen = new Set();
  let matches = 0;
  for (const n of numbers || []) {
    if (win.has(n) && !seen.has(n)) { seen.add(n); matches += 1; }
  }
  return matches;
}

/**
 * Splits the pool across the three tiers.
 * The 5-match tier absorbs any incoming rollover and rolls forward when nobody
 * claims it; the 4 and 3 tiers never roll over — an unclaimed tier simply
 * returns to the platform pool for that month.
 */
function distributePrizes({ prizePool, rolloverIn = 0, winnersByTier }) {
  const result = { tiers: {}, rolloverOut: 0, totalAwarded: 0 };

  for (const tier of [5, 4, 3]) {
    const base = round2(prizePool * TIER_SHARE[tier]);
    const tierPool = tier === 5 ? round2(base + Number(rolloverIn || 0)) : base;
    const winners = winnersByTier[tier] || [];
    const perWinner = winners.length ? round2(tierPool / winners.length) : 0;
    const awarded = round2(perWinner * winners.length);

    result.tiers[tier] = {
      share: TIER_SHARE[tier],
      basePool: base,
      pool: tierPool,
      winnerCount: winners.length,
      perWinner,
      awarded,
      rollsOver: ROLLS_OVER[tier],
    };
    result.totalAwarded = round2(result.totalAwarded + awarded);
    if (!winners.length && ROLLS_OVER[tier]) result.rolloverOut = tierPool;
  }
  return result;
}

/**
 * Monthly pool contribution of one subscription.
 * Yearly plans are amortised across twelve months so a yearly subscriber
 * contributes the same each month as a monthly one.
 */
function monthlyPoolContribution(subscription, poolPercent) {
  const amount = Number(subscription.amount || 0);
  const monthlyValue = subscription.plan === 'yearly' ? amount / 12 : amount;
  return round2((monthlyValue * Number(poolPercent)) / 100);
}

/** Builds the full draw result from tickets. Pure — no database access. */
function runDraw({ entries, prizePool, rolloverIn = 0, method = 'random', winningNumbers = null }) {
  const numbers =
    winningNumbers && winningNumbers.length
      ? [...winningNumbers].sort((a, b) => a - b)
      : method === 'algorithmic'
        ? pickAlgorithmic(entries)
        : pickRandom();

  const scored = entries.map((entry) => ({
    ...entry,
    matched: countMatches(entry.numbers, numbers),
  }));

  const winnersByTier = { 5: [], 4: [], 3: [] };
  for (const entry of scored) {
    if (winnersByTier[entry.matched]) winnersByTier[entry.matched].push(entry);
  }

  const distribution = distributePrizes({ prizePool, rolloverIn, winnersByTier });

  const winners = [];
  for (const tier of [5, 4, 3]) {
    for (const entry of winnersByTier[tier]) {
      winners.push({
        userId: entry.userId,
        entryId: entry.entryId || null,
        name: entry.name,
        email: entry.email,
        tier,
        amount: distribution.tiers[tier].perWinner,
      });
    }
  }

  return {
    method,
    winningNumbers: numbers,
    entrantCount: entries.length,
    prizePool: round2(prizePool),
    rolloverIn: round2(rolloverIn),
    rolloverOut: distribution.rolloverOut,
    totalAwarded: distribution.totalAwarded,
    tiers: distribution.tiers,
    winners,
    entries: scored,
    frequency: frequencyMap(entries),
  };
}

module.exports = {
  MIN_NUMBER, MAX_NUMBER, PICK_COUNT, TIER_SHARE,
  pickRandom, pickAlgorithmic, countMatches, distributePrizes,
  monthlyPoolContribution, runDraw, frequencyMap, round2,
};
