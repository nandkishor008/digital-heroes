/**
 * Seeds the platform with charities, an administrator, demo players with full
 * score cards, active subscriptions and one published draw so every screen has
 * something real to show on first load.
 *
 *   npm run db:seed
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool, one, many } = require('../db');
const { runDraw, monthlyPoolContribution, round2 } = require('../utils/draw');
const { periodOf, periodEndDate } = require('../utils/helpers');

const ADMIN = { name: 'Priya Nair', email: 'admin@digitalheroes.test', password: 'Admin@12345' };
const DEMO = { name: 'Rahul Mehta', email: 'player@digitalheroes.test', password: 'Player@12345' };

const CHARITIES = [
  {
    name: 'Kavach Trust', category: 'Mental health', featured: true,
    tagline: 'A phone line that is always answered.',
    description:
      'Kavach Trust runs a 24-hour counselling line and free therapy clinics in eight cities. '
      + 'Contributions cover counsellor training and the cost of keeping the line staffed overnight, '
      + 'when most calls arrive.',
    image_url: 'https://images.unsplash.com/photo-1516585427167-9f4af9627e6c?w=1200&q=70',
    events: [
      { title: 'Kavach Charity Golf Day', date: '2026-10-18', venue: 'Karnataka Golf Association, Bengaluru' },
      { title: 'Night Line Volunteer Intake', date: '2026-11-02', venue: 'Online' },
    ],
  },
  {
    name: 'Second Innings Foundation', category: 'Veterans',
    tagline: 'Work and housing for service families.',
    description:
      'Places ex-service personnel into civilian careers and supports the families of those who did not '
      + 'come home. Every ₹2,000 funds one week of transitional housing.',
    image_url: 'https://images.unsplash.com/photo-1526676537331-7748c7b1a4a4?w=1200&q=70',
    events: [{ title: 'Remembrance Fourball', date: '2026-11-11', venue: 'Delhi Golf Club' }],
  },
  {
    name: 'Greenshoot India', category: 'Environment',
    tagline: 'Native trees, planted where the water is.',
    description:
      'Restores degraded catchment land with native species chosen for the local water table, then pays '
      + 'village custodians to look after the saplings for three years.',
    image_url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&q=70',
    events: [{ title: 'Monsoon Planting Week', date: '2026-10-05', venue: 'Nilgiris' }],
  },
  {
    name: 'Little Lungs', category: 'Children',
    tagline: 'Paediatric respiratory care for cities that cannot breathe.',
    description:
      'Mobile clinics screening children for asthma and chronic bronchitis in high-pollution districts, '
      + 'with free inhalers and follow-up for families who cannot afford them.',
    image_url: 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=1200&q=70',
    events: [{ title: 'Clear Air Classic', date: '2026-12-06', venue: 'Bombay Presidency Golf Club' }],
  },
  {
    name: 'Ekal Vidya', category: 'Education',
    tagline: 'One teacher, one village, one classroom at a time.',
    description:
      'Funds single-teacher schools in villages with no access to a government primary school, covering '
      + 'salary, materials and a daily meal.',
    image_url: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200&q=70',
    events: [{ title: 'Scholarship Scramble', date: '2026-10-25', venue: 'Jaipur' }],
  },
  {
    name: 'Paws & Pause', category: 'Animals',
    tagline: 'Street rescue, sterilisation and rehoming.',
    description:
      'A rescue network running sterilisation drives and an emergency ambulance for injured street '
      + 'animals across three metros.',
    image_url: 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=1200&q=70',
    events: [{ title: 'Tail Wagger Texas Scramble', date: '2026-11-22', venue: 'Chennai' }],
  },
];

const PLAYERS = [
  { name: 'Aisha Khan', email: 'aisha@example.com', plan: 'yearly', scores: [34, 31, 36, 29, 33] },
  { name: 'Vikram Rao', email: 'vikram@example.com', plan: 'monthly', scores: [28, 41, 22, 37, 30] },
  { name: 'Meera Joshi', email: 'meera@example.com', plan: 'monthly', scores: [39, 25, 33, 18, 36] },
  { name: 'Daniel Fernandes', email: 'daniel@example.com', plan: 'yearly', scores: [30, 35, 27, 42, 31] },
  { name: 'Sana Qureshi', email: 'sana@example.com', plan: 'monthly', scores: [24, 38, 32, 29, 40] },
  { name: 'Arjun Pillai', email: 'arjun@example.com', plan: 'monthly', scores: [33, 26, 44, 35, 21] },
  { name: 'Nisha Bhatt', email: 'nisha@example.com', plan: 'yearly', scores: [37, 30, 23, 34, 28] },
  { name: 'Kabir Sethi', email: 'kabir@example.com', plan: 'monthly', scores: [19, 32, 36, 43, 27] },
];

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};
const addMonths = (n) => {
  const d = new Date();
  d.setMonth(d.getMonth() + n);
  return d;
};

async function seed() {
  const prices = { monthly: 499, yearly: 4999 };

  console.log('Seeding charities…');
  const charityIds = [];
  for (const c of CHARITIES) {
    const row = await one(
      `insert into charities (name, slug, category, tagline, description, image_url, events, featured)
       values ($1,$2,$3,$4,$5,$6,$7::jsonb,$8)
       on conflict (slug) do update set
         name = excluded.name, category = excluded.category, tagline = excluded.tagline,
         description = excluded.description, image_url = excluded.image_url,
         events = excluded.events, featured = excluded.featured
       returning id`,
      [c.name, slugify(c.name), c.category, c.tagline, c.description, c.image_url,
        JSON.stringify(c.events || []), Boolean(c.featured)]
    );
    charityIds.push(row.id);
  }

  console.log('Seeding accounts…');
  async function upsertUser({ name, email, password, role = 'user', charityId, percent = 10 }) {
    const hash = await bcrypt.hash(password, 10);
    return one(
      `insert into users (name, email, password_hash, role, charity_id, charity_percent)
       values ($1,$2,$3,$4,$5,$6)
       on conflict (email) do update set
         name = excluded.name, password_hash = excluded.password_hash, role = excluded.role,
         charity_id = excluded.charity_id, charity_percent = excluded.charity_percent
       returning *`,
      [name, email, hash, role, charityId || null, percent]
    );
  }

  await upsertUser({ ...ADMIN, role: 'admin', charityId: charityIds[0], percent: 20 });

  const demoScores = [34, 31, 36, 29, 33];
  const people = [{ ...DEMO, plan: 'monthly', scores: demoScores, percent: 15 }, ...PLAYERS.map((p, i) => ({
    ...p, password: 'Player@12345', percent: [10, 10, 15, 25, 10, 12, 10, 30][i] || 10,
  }))];

  const created = [];
  for (let i = 0; i < people.length; i++) {
    const p = people[i];
    const charityId = charityIds[i % charityIds.length];
    const user = await upsertUser({
      name: p.name, email: p.email, password: p.password, charityId, percent: p.percent,
    });

    // active subscription
    const amount = prices[p.plan];
    await one('delete from subscriptions where user_id = $1 returning id', [user.id]);
    const sub = await one(
      `insert into subscriptions (user_id, plan, amount, status, provider, provider_ref, current_period_end)
       values ($1,$2,$3,'active','demo',$4,$5) returning *`,
      [user.id, p.plan, amount, `seed_${user.id.slice(0, 8)}`, addMonths(p.plan === 'yearly' ? 12 : 1)]
    );

    await one('delete from charity_contributions where user_id = $1 returning id', [user.id]);
    await one(
      `insert into charity_contributions (user_id, charity_id, subscription_id, amount, percent, source, period)
       values ($1,$2,$3,$4,$5,'subscription',$6) returning id`,
      [user.id, charityId, sub.id, round2((amount * p.percent) / 100), p.percent, periodOf()]
    );

    // a full card of five scores, one per date
    await one('delete from scores where user_id = $1 returning id', [user.id]);
    for (let s = 0; s < p.scores.length; s++) {
      await one(
        'insert into scores (user_id, score, played_on) values ($1,$2,$3) returning id',
        [user.id, p.scores[s], daysAgo(s * 7 + 2)]
      );
    }
    created.push({ user, plan: p.plan, amount, numbers: p.scores });
  }

  console.log('Publishing a sample draw…');
  const period = periodOf(new Date(new Date().setMonth(new Date().getMonth() - 1)));
  await one('delete from draws where period = $1 returning id', [period]);

  const prizePool = round2(
    created.reduce((sum, c) => sum + monthlyPoolContribution({ plan: c.plan, amount: c.amount }, 30), 0)
  );
  const entries = created.map((c) => ({
    userId: c.user.id, name: c.user.name, email: c.user.email, numbers: c.numbers,
  }));

  // Force a 3-match and a 4-match so the winner-verification flow is visible.
  const seeded = [entries[0].numbers[0], entries[0].numbers[1], entries[0].numbers[2], 45, 44];
  const result = runDraw({ entries, prizePool, rolloverIn: 0, method: 'random', winningNumbers: seeded });

  const draw = await one(
    `insert into draws (period, method, winning_numbers, status, prize_pool, rollover_in, rollover_out,
                        entrant_count, draw_date, published_at, stats)
     values ($1,'random',$2,'published',$3,0,$4,$5,$6, now(), $7::jsonb) returning *`,
    [period, result.winningNumbers, result.prizePool, result.rolloverOut, result.entrantCount,
      periodEndDate(period),
      JSON.stringify({ tiers: result.tiers, frequency: result.frequency, totalAwarded: result.totalAwarded })]
  );

  for (const entry of result.entries) {
    const e = await one(
      'insert into draw_entries (draw_id, user_id, numbers, matched) values ($1,$2,$3,$4) returning id',
      [draw.id, entry.userId, entry.numbers, entry.matched]
    );
    const win = result.winners.find((w) => w.userId === entry.userId);
    if (win) {
      await one(
        `insert into winnings (draw_id, user_id, entry_id, tier, amount) values ($1,$2,$3,$4,$5)
         on conflict (draw_id, user_id) do nothing returning id`,
        [draw.id, entry.userId, e.id, win.tier, win.amount]
      );
    }
  }

  const winnerCount = (await many('select id from winnings where draw_id = $1', [draw.id])).length;

  console.log('\nDone.');
  console.log('─'.repeat(58));
  console.log(`Admin   ${ADMIN.email} / ${ADMIN.password}`);
  console.log(`Player  ${DEMO.email} / ${DEMO.password}`);
  console.log(`Others  <name>@example.com / Player@12345`);
  console.log('─'.repeat(58));
  console.log(`Charities: ${CHARITIES.length}  ·  Subscribers: ${created.length}`);
  console.log(`Draw ${period}: numbers ${result.winningNumbers.join(', ')}  ·  winners ${winnerCount}`);
  console.log(`Prize pool ₹${result.prizePool}  ·  jackpot carried ₹${result.rolloverOut}`);
}

seed()
  .catch((err) => { console.error('Seed failed:', err); process.exitCode = 1; })
  .finally(() => pool.end());
