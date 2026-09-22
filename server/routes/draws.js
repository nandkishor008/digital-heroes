const router = require('express').Router();
const { one, many } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { wrap, periodOf, nextPeriod, periodEndDate, allSettings } = require('../utils/helpers');
const { monthlyPoolContribution, TIER_SHARE, round2 } = require('../utils/draw');

/** Live estimate of this month's pool from active subscriptions. */
async function projectedPool() {
  const settings = await allSettings();
  const subs = await many(
    `select plan, amount from subscriptions
      where status = 'active' and current_period_end > now()`
  );
  const pool = subs.reduce(
    (sum, s) => sum + monthlyPoolContribution(s, settings.prize_pool_percent),
    0
  );
  const rollover = await one(
    `select coalesce(rollover_out, 0) as rollover_out from draws
      where status = 'published' order by period desc limit 1`
  );
  const rolloverIn = Number(rollover?.rollover_out || 0);
  return {
    subscribers: subs.length,
    prizePool: round2(pool),
    rolloverIn: round2(rolloverIn),
    tiers: {
      5: round2(pool * TIER_SHARE[5] + rolloverIn),
      4: round2(pool * TIER_SHARE[4]),
      3: round2(pool * TIER_SHARE[3]),
    },
  };
}

/** GET /api/draws — published results, newest first (public). */
router.get('/', wrap(async (req, res) => {
  const draws = await many(
    `select d.id, d.period, d.method, d.winning_numbers, d.prize_pool, d.rollover_in,
            d.rollover_out, d.entrant_count, d.draw_date, d.published_at, d.stats,
            (select count(*) from winnings w where w.draw_id = d.id)::int as winner_count
       from draws d where d.status = 'published'
      order by d.period desc limit 24`
  );
  res.json({ draws });
}));

/** GET /api/draws/next — the upcoming draw and the projected pool (public). */
router.get('/next', wrap(async (req, res) => {
  const period = periodOf();
  const published = await one("select id from draws where period = $1 and status = 'published'", [period]);
  const targetPeriod = published ? nextPeriod(period) : period;
  const projection = await projectedPool();
  res.json({
    period: targetPeriod,
    drawDate: periodEndDate(targetPeriod),
    ...projection,
  });
}));

/** GET /api/draws/me — the signed-in player's participation history. */
router.get('/me', requireAuth, wrap(async (req, res) => {
  const entries = await many(
    `select e.id, e.numbers, e.matched, e.created_at,
            d.period, d.winning_numbers, d.draw_date, d.method,
            w.tier, w.amount, w.verification_status, w.payment_status
       from draw_entries e
       join draws d on d.id = e.draw_id
       left join winnings w on w.draw_id = d.id and w.user_id = e.user_id
      where e.user_id = $1 and d.status = 'published'
      order by d.period desc`,
    [req.user.id]
  );

  const scores = await many(
    'select score, played_on from scores where user_id = $1 order by played_on desc limit 5',
    [req.user.id]
  );

  const next = await one(
    `select period from draws where status = 'published' order by period desc limit 1`
  );
  const period = next && next.period === periodOf() ? nextPeriod(periodOf()) : periodOf();

  res.json({
    entries,
    drawsEntered: entries.length,
    eligible: Boolean(req.subscription) && scores.length === 5,
    myNumbers: scores.map((s) => s.score),
    next: { period, drawDate: periodEndDate(period), ...(await projectedPool()) },
  });
}));

/** GET /api/draws/:period — one published result (public). */
router.get('/:period', wrap(async (req, res) => {
  const draw = await one(
    "select * from draws where period = $1 and status = 'published'",
    [req.params.period]
  );
  if (!draw) return res.status(404).json({ error: 'No published draw for that month.' });

  const winners = await many(
    `select w.tier, w.amount, w.payment_status, u.name
       from winnings w join users u on u.id = w.user_id
      where w.draw_id = $1 order by w.tier desc, w.amount desc`,
    [draw.id]
  );
  res.json({ draw, winners });
}));

module.exports = router;
module.exports.projectedPool = projectedPool;
