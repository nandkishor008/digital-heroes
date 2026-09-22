const router = require('express').Router();
const { one, many, tx } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const {
  wrap, fail, periodOf, periodEndDate, allSettings, setSetting, isIsoDate,
} = require('../utils/helpers');
const { runDraw, monthlyPoolContribution, round2 } = require('../utils/draw');

router.use(requireAuth, requireAdmin);

/* ------------------------------------------------------------------ users */

/** GET /api/admin/users */
router.get('/users', wrap(async (req, res) => {
  const search = (req.query.search || '').trim();
  const users = await many(
    `select u.id, u.name, u.email, u.role, u.phone, u.charity_percent, u.created_at,
            c.name as charity_name,
            s.plan, s.status as subscription_status, s.current_period_end, s.amount,
            (select count(*) from scores sc where sc.user_id = u.id)::int as score_count,
            (select coalesce(sum(w.amount),0) from winnings w where w.user_id = u.id)::numeric as total_won
       from users u
       left join charities c on c.id = u.charity_id
       left join lateral (
         select * from subscriptions s2 where s2.user_id = u.id
         order by (s2.status = 'active') desc, s2.created_at desc limit 1
       ) s on true
      where ($1 = '' or u.name ilike '%'||$1||'%' or u.email ilike '%'||$1||'%')
      order by u.created_at desc`,
    [search]
  );
  res.json({ users });
}));

/** GET /api/admin/users/:id — full profile with scores, subs, wins. */
router.get('/users/:id', wrap(async (req, res) => {
  const user = await one(
    `select u.id, u.name, u.email, u.role, u.phone, u.charity_id, u.charity_percent, u.created_at,
            c.name as charity_name
       from users u left join charities c on c.id = u.charity_id where u.id = $1`,
    [req.params.id]
  );
  if (!user) fail(404, 'No such user.');

  const [scores, subscriptions, winnings, contributions] = await Promise.all([
    many('select * from scores where user_id = $1 order by played_on desc limit 5', [user.id]),
    many('select * from subscriptions where user_id = $1 order by created_at desc', [user.id]),
    many(`select w.*, d.period from winnings w join draws d on d.id = w.draw_id
           where w.user_id = $1 order by d.period desc`, [user.id]),
    many('select * from charity_contributions where user_id = $1 order by created_at desc', [user.id]),
  ]);
  res.json({ user, scores, subscriptions, winnings, contributions });
}));

/** PATCH /api/admin/users/:id — edit profile, role, charity split. */
router.patch('/users/:id', wrap(async (req, res) => {
  const fields = ['name', 'email', 'phone', 'role', 'charity_id', 'charity_percent'];
  const updates = [];
  const values = [];
  let i = 1;
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      if (f === 'role' && !['user', 'admin'].includes(req.body[f])) fail(400, 'Role must be user or admin.');
      updates.push(`${f} = $${i++}`);
      values.push(req.body[f] === '' ? null : req.body[f]);
    }
  }
  if (!updates.length) fail(400, 'Nothing to update.');
  values.push(req.params.id);
  const user = await one(
    `update users set ${updates.join(', ')} where id = $${i}
     returning id, name, email, role, phone, charity_id, charity_percent, created_at`,
    values
  );
  if (!user) fail(404, 'No such user.');
  res.json({ user });
}));

/** PUT /api/admin/users/:id/scores/:scoreId — correct a player's card. */
router.put('/users/:id/scores/:scoreId', wrap(async (req, res) => {
  const score = Number(req.body.score);
  if (!Number.isInteger(score) || score < 1 || score > 45) fail(400, 'Score must be 1–45.');
  if (!isIsoDate(req.body.played_on)) fail(400, 'Provide a valid date.');

  const clash = await one(
    'select id from scores where user_id = $1 and played_on = $2 and id <> $3',
    [req.params.id, req.body.played_on, req.params.scoreId]
  );
  if (clash) fail(409, 'That player already has a score on that date.');

  const updated = await one(
    'update scores set score = $1, played_on = $2 where id = $3 and user_id = $4 returning *',
    [score, req.body.played_on, req.params.scoreId, req.params.id]
  );
  if (!updated) fail(404, 'No such score.');
  res.json({ score: updated });
}));

/** DELETE /api/admin/users/:id/scores/:scoreId */
router.delete('/users/:id/scores/:scoreId', wrap(async (req, res) => {
  const removed = await one('delete from scores where id = $1 and user_id = $2 returning id', [
    req.params.scoreId, req.params.id,
  ]);
  if (!removed) fail(404, 'No such score.');
  res.json({ removed: removed.id });
}));

/* ---------------------------------------------------------- subscriptions */

/** GET /api/admin/subscriptions */
router.get('/subscriptions', wrap(async (req, res) => {
  const subscriptions = await many(
    `select s.*, u.name, u.email from subscriptions s join users u on u.id = s.user_id
      order by s.created_at desc`
  );
  res.json({ subscriptions });
}));

/** PATCH /api/admin/subscriptions/:id — status or period end. */
router.patch('/subscriptions/:id', wrap(async (req, res) => {
  const updates = [];
  const values = [];
  let i = 1;
  if (req.body.status) {
    if (!['active', 'cancelled', 'expired'].includes(req.body.status)) fail(400, 'Unknown status.');
    updates.push(`status = $${i++}`); values.push(req.body.status);
  }
  if (req.body.current_period_end) {
    updates.push(`current_period_end = $${i++}`); values.push(req.body.current_period_end);
  }
  if (!updates.length) fail(400, 'Nothing to update.');
  values.push(req.params.id);
  const subscription = await one(
    `update subscriptions set ${updates.join(', ')} where id = $${i} returning *`, values
  );
  if (!subscription) fail(404, 'No such subscription.');
  res.json({ subscription });
}));

/* ------------------------------------------------------------------ draws */

/** Builds the ticket list: subscribers holding a full card of five scores. */
async function buildEntries() {
  const rows = await many(
    `select u.id as user_id, u.name, u.email,
            array_agg(s.score order by s.played_on desc) as numbers
       from users u
       join subscriptions sub on sub.user_id = u.id
        and sub.status = 'active' and sub.current_period_end > now()
       join lateral (
         select score, played_on from scores where user_id = u.id
         order by played_on desc limit 5
       ) s on true
      group by u.id
     having count(s.score) = 5`
  );
  return rows.map((r) => ({ userId: r.user_id, name: r.name, email: r.email, numbers: r.numbers }));
}

/** Pool value for a period, from active subscriptions. */
async function poolFor(period) {
  const settings = await allSettings();
  const subs = await many(
    `select plan, amount from subscriptions where status = 'active' and current_period_end > now()`
  );
  const pool = subs.reduce((sum, s) => sum + monthlyPoolContribution(s, settings.prize_pool_percent), 0);
  const previous = await one(
    `select rollover_out from draws
      where status = 'published' and period < $1 order by period desc limit 1`,
    [period]
  );
  return { prizePool: round2(pool), rolloverIn: round2(Number(previous?.rollover_out || 0)) };
}

/** GET /api/admin/draws */
router.get('/draws', wrap(async (req, res) => {
  const draws = await many(
    `select d.*, (select count(*) from winnings w where w.draw_id = d.id)::int as winner_count
       from draws d order by d.period desc`
  );
  const settings = await allSettings();
  res.json({ draws, settings });
}));

/**
 * POST /api/admin/draws/simulate
 * Runs the engine without touching player records and saves a draft draw so
 * the numbers that were reviewed are the numbers that get published.
 */
router.post('/draws/simulate', wrap(async (req, res) => {
  const period = req.body.period || periodOf();
  const settings = await allSettings();
  const method = req.body.method || settings.draw_method || 'random';
  if (!['random', 'algorithmic'].includes(method)) fail(400, 'Method must be random or algorithmic.');

  const existing = await one('select * from draws where period = $1', [period]);
  if (existing?.status === 'published') fail(409, `The ${period} draw is already published.`);

  const entries = await buildEntries();
  const { prizePool, rolloverIn } = await poolFor(period);
  const result = runDraw({ entries, prizePool, rolloverIn, method });

  const draw = await one(
    `insert into draws (period, method, winning_numbers, status, prize_pool, rollover_in,
                        rollover_out, entrant_count, draw_date, stats)
     values ($1, $2, $3, 'simulated', $4, $5, $6, $7, $8, $9::jsonb)
     on conflict (period) do update set
       method = excluded.method, winning_numbers = excluded.winning_numbers,
       prize_pool = excluded.prize_pool, rollover_in = excluded.rollover_in,
       rollover_out = excluded.rollover_out, entrant_count = excluded.entrant_count,
       stats = excluded.stats, status = 'simulated'
     returning *`,
    [
      period, method, result.winningNumbers, result.prizePool, result.rolloverIn,
      result.rolloverOut, result.entrantCount, periodEndDate(period),
      JSON.stringify({ tiers: result.tiers, frequency: result.frequency, totalAwarded: result.totalAwarded }),
    ]
  );

  res.json({
    draw,
    preview: {
      winningNumbers: result.winningNumbers,
      tiers: result.tiers,
      entrantCount: result.entrantCount,
      prizePool: result.prizePool,
      rolloverIn: result.rolloverIn,
      rolloverOut: result.rolloverOut,
      totalAwarded: result.totalAwarded,
      winners: result.winners,
      frequency: result.frequency,
    },
  });
}));

/**
 * POST /api/admin/draws/:id/publish
 * Freezes the draft: writes every entry, creates the winnings rows (each one
 * starting at pending verification) and carries the jackpot forward.
 */
router.post('/draws/:id/publish', wrap(async (req, res) => {
  const draw = await one('select * from draws where id = $1', [req.params.id]);
  if (!draw) fail(404, 'No such draw.');
  if (draw.status === 'published') fail(409, 'This draw is already published.');

  const entries = await buildEntries();
  if (!entries.length) fail(400, 'No eligible entries yet — subscribers need five scores each.');

  const result = runDraw({
    entries,
    prizePool: Number(draw.prize_pool),
    rolloverIn: Number(draw.rollover_in),
    method: draw.method,
    winningNumbers: draw.winning_numbers,
  });

  const published = await tx(async (client) => {
    await client.query('delete from draw_entries where draw_id = $1', [draw.id]);

    const entryIds = {};
    for (const entry of result.entries) {
      const { rows } = await client.query(
        `insert into draw_entries (draw_id, user_id, numbers, matched)
         values ($1, $2, $3, $4) returning id`,
        [draw.id, entry.userId, entry.numbers, entry.matched]
      );
      entryIds[entry.userId] = rows[0].id;
    }

    for (const winner of result.winners) {
      await client.query(
        `insert into winnings (draw_id, user_id, entry_id, tier, amount)
         values ($1, $2, $3, $4, $5)
         on conflict (draw_id, user_id) do update set
           tier = excluded.tier, amount = excluded.amount`,
        [draw.id, winner.userId, entryIds[winner.userId] || null, winner.tier, winner.amount]
      );
    }

    const { rows } = await client.query(
      `update draws set status = 'published', published_at = now(),
              entrant_count = $2, rollover_out = $3, stats = $4::jsonb
        where id = $1 returning *`,
      [
        draw.id, result.entrantCount, result.rolloverOut,
        JSON.stringify({ tiers: result.tiers, frequency: result.frequency, totalAwarded: result.totalAwarded }),
      ]
    );
    return rows[0];
  });

  res.json({ draw: published, winners: result.winners, tiers: result.tiers });
}));

/** DELETE /api/admin/draws/:id — removes a draft that was never published. */
router.delete('/draws/:id', wrap(async (req, res) => {
  const draw = await one('select * from draws where id = $1', [req.params.id]);
  if (!draw) fail(404, 'No such draw.');
  if (draw.status === 'published') fail(400, 'Published draws cannot be deleted.');
  await one('delete from draws where id = $1 returning id', [draw.id]);
  res.json({ deleted: draw.id });
}));

/** GET /api/admin/draws/eligibility — who is holding a valid ticket right now. */
router.get('/draws/eligibility', wrap(async (req, res) => {
  const entries = await buildEntries();
  const period = periodOf();
  const pool = await poolFor(period);
  res.json({ period, drawDate: periodEndDate(period), entries, ...pool });
}));

/* --------------------------------------------------------------- settings */

/** PUT /api/admin/settings */
router.put('/settings', wrap(async (req, res) => {
  if (req.body.prize_pool_percent !== undefined) {
    const p = Number(req.body.prize_pool_percent);
    if (!Number.isFinite(p) || p < 1 || p > 90) fail(400, 'Pool share must be between 1% and 90%.');
    await setSetting('prize_pool_percent', p);
  }
  if (req.body.draw_method !== undefined) {
    if (!['random', 'algorithmic'].includes(req.body.draw_method)) fail(400, 'Unknown draw method.');
    await setSetting('draw_method', req.body.draw_method);
  }
  if (req.body.plan_prices !== undefined) {
    const { monthly, yearly } = req.body.plan_prices;
    if (!(monthly > 0) || !(yearly > 0)) fail(400, 'Plan prices must be positive.');
    await setSetting('plan_prices', { monthly: Number(monthly), yearly: Number(yearly) });
  }
  res.json({ settings: await allSettings() });
}));

router.get('/settings', wrap(async (req, res) => res.json({ settings: await allSettings() })));

/* -------------------------------------------------------------- charities */

const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

router.get('/charities', wrap(async (req, res) => {
  const charities = await many(
    `select c.*, coalesce(sum(cc.amount),0)::numeric as raised,
            count(distinct u.id)::int as supporters
       from charities c
       left join charity_contributions cc on cc.charity_id = c.id
       left join users u on u.charity_id = c.id
      group by c.id order by c.featured desc, c.name`
  );
  res.json({ charities });
}));

router.post('/charities', wrap(async (req, res) => {
  const name = (req.body.name || '').trim();
  if (name.length < 2) fail(400, 'Give the charity a name.');
  const charity = await one(
    `insert into charities (name, slug, category, tagline, description, image_url, hero_url, events, featured, active)
     values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10) returning *`,
    [
      name, req.body.slug || slugify(name), req.body.category || 'General',
      req.body.tagline || null, req.body.description || null,
      req.body.image_url || null, req.body.hero_url || null,
      JSON.stringify(req.body.events || []),
      Boolean(req.body.featured), req.body.active !== false,
    ]
  );
  res.status(201).json({ charity });
}));

router.patch('/charities/:id', wrap(async (req, res) => {
  const fields = ['name', 'slug', 'category', 'tagline', 'description', 'image_url', 'hero_url', 'featured', 'active'];
  const updates = [];
  const values = [];
  let i = 1;
  for (const f of fields) {
    if (req.body[f] !== undefined) { updates.push(`${f} = $${i++}`); values.push(req.body[f]); }
  }
  if (req.body.events !== undefined) {
    updates.push(`events = $${i++}::jsonb`); values.push(JSON.stringify(req.body.events));
  }
  if (!updates.length) fail(400, 'Nothing to update.');
  values.push(req.params.id);
  const charity = await one(
    `update charities set ${updates.join(', ')} where id = $${i} returning *`, values
  );
  if (!charity) fail(404, 'No such charity.');
  res.json({ charity });
}));

router.delete('/charities/:id', wrap(async (req, res) => {
  const supporters = await one('select count(*)::int as n from users where charity_id = $1', [req.params.id]);
  if (supporters.n > 0) {
    // Keep the ledger intact: retire the listing instead of breaking history.
    const charity = await one('update charities set active = false where id = $1 returning *', [req.params.id]);
    if (!charity) fail(404, 'No such charity.');
    return res.json({ charity, retired: true, supporters: supporters.n });
  }
  const removed = await one('delete from charities where id = $1 returning id', [req.params.id]);
  if (!removed) fail(404, 'No such charity.');
  res.json({ deleted: removed.id });
}));

/* ---------------------------------------------------------------- winners */

router.get('/winners', wrap(async (req, res) => {
  const status = (req.query.status || '').trim();
  const winners = await many(
    `select w.*, u.name, u.email, d.period, d.winning_numbers, e.numbers as player_numbers
       from winnings w
       join users u on u.id = w.user_id
       join draws d on d.id = w.draw_id
       left join draw_entries e on e.id = w.entry_id
      where ($1 = '' or w.verification_status = $1)
      order by (w.verification_status = 'submitted') desc, d.period desc, w.tier desc`,
    [status]
  );
  res.json({ winners });
}));

/** POST /api/admin/winners/:id/review — approve or reject the proof. */
router.post('/winners/:id/review', wrap(async (req, res) => {
  const decision = req.body.decision;
  if (!['approved', 'rejected'].includes(decision)) fail(400, 'Decision must be approved or rejected.');

  const winning = await one('select * from winnings where id = $1', [req.params.id]);
  if (!winning) fail(404, 'No such win.');
  if (!winning.proof_url) fail(400, 'This winner has not uploaded proof yet.');

  const updated = await one(
    `update winnings set verification_status = $1, review_note = $2,
            reviewed_by = $3, reviewed_at = now()
      where id = $4 returning *`,
    [decision, (req.body.note || '').slice(0, 500), req.user.id, winning.id]
  );
  res.json({ winning: updated });
}));

/** POST /api/admin/winners/:id/pay — approved wins only. */
router.post('/winners/:id/pay', wrap(async (req, res) => {
  const winning = await one('select * from winnings where id = $1', [req.params.id]);
  if (!winning) fail(404, 'No such win.');
  if (winning.verification_status !== 'approved') fail(400, 'Verify the proof before marking it paid.');
  if (winning.payment_status === 'paid') fail(400, 'This payout is already marked paid.');

  const updated = await one(
    `update winnings set payment_status = 'paid', paid_at = now(), payout_ref = $1
      where id = $2 returning *`,
    [req.body.payout_ref || `PAY-${Date.now().toString(36).toUpperCase()}`, winning.id]
  );
  res.json({ winning: updated });
}));

/* -------------------------------------------------------------- analytics */

/** GET /api/admin/analytics */
router.get('/analytics', wrap(async (req, res) => {
  const settings = await allSettings();

  const [users, subs, draws, winningsAgg, contributions] = await Promise.all([
    one(`select count(*)::int as total,
                count(*) filter (where role = 'admin')::int as admins,
                count(*) filter (where created_at > now() - interval '30 days')::int as new_30d
           from users`),
    many(`select plan, status, amount, current_period_end from subscriptions`),
    many(`select period, prize_pool, rollover_in, rollover_out, entrant_count, method, status,
                 (select count(*) from winnings w where w.draw_id = d.id)::int as winner_count
            from draws d order by period desc limit 12`),
    one(`select coalesce(sum(amount),0)::numeric as total,
                coalesce(sum(amount) filter (where payment_status = 'paid'),0)::numeric as paid,
                count(*)::int as wins,
                count(*) filter (where verification_status = 'submitted')::int as awaiting_review
           from winnings`),
    many(`select c.name, c.id, coalesce(sum(cc.amount),0)::numeric as raised,
                 count(cc.id)::int as gifts
            from charities c left join charity_contributions cc on cc.charity_id = c.id
           group by c.id order by raised desc`),
  ]);

  const active = subs.filter((s) => s.status === 'active' && new Date(s.current_period_end) > new Date());
  const mrr = active.reduce(
    (sum, s) => sum + (s.plan === 'yearly' ? Number(s.amount) / 12 : Number(s.amount)), 0
  );
  const currentPool = round2((mrr * Number(settings.prize_pool_percent)) / 100);

  res.json({
    users,
    subscriptions: {
      active: active.length,
      monthly: active.filter((s) => s.plan === 'monthly').length,
      yearly: active.filter((s) => s.plan === 'yearly').length,
      cancelled: subs.filter((s) => s.status === 'cancelled').length,
      expired: subs.filter((s) => s.status === 'expired').length,
      mrr: round2(mrr),
    },
    prizePool: {
      currentMonth: currentPool,
      percent: Number(settings.prize_pool_percent),
      lifetime: round2(draws.reduce((sum, d) => sum + Number(d.prize_pool), 0)),
      jackpotCarry: round2(Number(draws.find((d) => d.status === 'published')?.rollover_out || 0)),
    },
    winnings: winningsAgg,
    charity: {
      total: round2(contributions.reduce((sum, c) => sum + Number(c.raised), 0)),
      byCharity: contributions,
    },
    draws,
  });
}));

module.exports = router;
