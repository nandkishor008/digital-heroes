/**
 * Assertions for the money logic. No database involved.
 *   npm run test:draw
 */
const assert = require('assert');
const {
  runDraw, distributePrizes, countMatches, pickRandom, pickAlgorithmic,
  monthlyPoolContribution,
} = require('../utils/draw');

let passed = 0;
const test = (name, fn) => {
  try {
    fn();
    passed += 1;
    console.log(`  ok   ${name}`);
  } catch (err) {
    console.error(`  FAIL ${name}\n       ${err.message}`);
    process.exitCode = 1;
  }
};

console.log('\nDraw engine\n');

test('random selection returns five distinct numbers in range', () => {
  for (let i = 0; i < 200; i++) {
    const picked = pickRandom();
    assert.strictEqual(picked.length, 5);
    assert.strictEqual(new Set(picked).size, 5);
    assert.ok(picked.every((n) => n >= 1 && n <= 45));
    assert.deepStrictEqual(picked, [...picked].sort((a, b) => a - b));
  }
});

test('weighted selection also returns five distinct numbers in range', () => {
  const entries = [
    { userId: 'a', numbers: [10, 20, 30, 40, 45] },
    { userId: 'b', numbers: [10, 20, 31, 41, 44] },
  ];
  for (let i = 0; i < 200; i++) {
    const picked = pickAlgorithmic(entries);
    assert.strictEqual(new Set(picked).size, 5);
    assert.ok(picked.every((n) => n >= 1 && n <= 45));
  }
});

test('match counting ignores duplicate numbers on a card', () => {
  assert.strictEqual(countMatches([5, 5, 9, 12, 40], [5, 9, 22, 30, 31]), 2);
  assert.strictEqual(countMatches([1, 2, 3, 4, 5], [1, 2, 3, 4, 5]), 5);
  assert.strictEqual(countMatches([1, 2, 3, 4, 5], [6, 7, 8, 9, 10]), 0);
});

test('tier shares are 40 / 35 / 25 of the pool', () => {
  const d = distributePrizes({
    prizePool: 50000,
    winnersByTier: { 5: [{}], 4: [{}], 3: [{}] },
  });
  assert.strictEqual(d.tiers[5].pool, 20000);
  assert.strictEqual(d.tiers[4].pool, 17500);
  assert.strictEqual(d.tiers[3].pool, 12500);
});

test('a tier is split equally between its winners', () => {
  const d = distributePrizes({
    prizePool: 50000,
    winnersByTier: { 5: [], 4: [{}, {}], 3: [] },
  });
  assert.strictEqual(d.tiers[4].perWinner, 8750);
  assert.strictEqual(d.tiers[4].awarded, 17500);
});

test('an unclaimed jackpot rolls over; lower tiers do not', () => {
  const d = distributePrizes({
    prizePool: 50000,
    winnersByTier: { 5: [], 4: [], 3: [] },
  });
  assert.strictEqual(d.rolloverOut, 20000);
  assert.strictEqual(d.totalAwarded, 0);
});

test('incoming rollover is added to the jackpot only', () => {
  const d = distributePrizes({
    prizePool: 50000,
    rolloverIn: 20000,
    winnersByTier: { 5: [{}], 4: [{}], 3: [{}] },
  });
  assert.strictEqual(d.tiers[5].perWinner, 40000);
  assert.strictEqual(d.tiers[4].pool, 17500);
  assert.strictEqual(d.rolloverOut, 0);
});

test('a claimed jackpot carries nothing forward', () => {
  const d = distributePrizes({
    prizePool: 10000,
    rolloverIn: 5000,
    winnersByTier: { 5: [{}, {}], 4: [], 3: [] },
  });
  assert.strictEqual(d.tiers[5].perWinner, 4500);
  assert.strictEqual(d.rolloverOut, 0);
});

test('a full draw assigns every winner the right tier and amount', () => {
  const entries = [
    { userId: 'a', name: 'A', email: 'a@x', numbers: [1, 2, 3, 4, 5] },
    { userId: 'b', name: 'B', email: 'b@x', numbers: [1, 2, 3, 40, 41] },
    { userId: 'c', name: 'C', email: 'c@x', numbers: [1, 2, 3, 4, 42] },
    { userId: 'd', name: 'D', email: 'd@x', numbers: [30, 31, 32, 33, 34] },
  ];
  const result = runDraw({ entries, prizePool: 100000, winningNumbers: [1, 2, 3, 4, 5] });

  const byUser = Object.fromEntries(result.winners.map((w) => [w.userId, w]));
  assert.strictEqual(byUser.a.tier, 5);
  assert.strictEqual(byUser.a.amount, 40000);
  assert.strictEqual(byUser.c.tier, 4);
  assert.strictEqual(byUser.c.amount, 35000);
  assert.strictEqual(byUser.b.tier, 3);
  assert.strictEqual(byUser.b.amount, 25000);
  assert.strictEqual(byUser.d, undefined);
  assert.strictEqual(result.entrantCount, 4);
});

test('nothing is awarded beyond the pool plus the rollover', () => {
  const entries = Array.from({ length: 40 }, (_, i) => ({
    userId: `u${i}`, numbers: [1, 2, 3, (i % 40) + 5, ((i * 7) % 40) + 5],
  }));
  const result = runDraw({ entries, prizePool: 80000, rolloverIn: 12000, winningNumbers: [1, 2, 3, 4, 5] });
  assert.ok(result.totalAwarded + result.rolloverOut <= 80000 + 12000 + 0.01);
});

console.log('\nSubscription contributions\n');

test('a yearly plan is amortised across twelve months', () => {
  assert.strictEqual(monthlyPoolContribution({ plan: 'yearly', amount: 4999 }, 30), 124.98);
  assert.strictEqual(monthlyPoolContribution({ plan: 'monthly', amount: 499 }, 30), 149.7);
});

console.log(`\n${passed} assertions passed.\n`);
