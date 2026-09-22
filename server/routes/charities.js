const router = require('express').Router();
const { one, many } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { wrap, fail, periodOf } = require('../utils/helpers');

/** GET /api/charities — directory with search, filter and raised totals. */
router.get('/', wrap(async (req, res) => {
  const search = (req.query.search || '').trim();
  const category = (req.query.category || '').trim();

  const charities = await many(
    `select c.*,
            coalesce(sum(cc.amount), 0)::numeric as raised,
            count(distinct u.id)::int           as supporters
       from charities c
       left join charity_contributions cc on cc.charity_id = c.id
       left join users u on u.charity_id = c.id
      where c.active = true
        and ($1 = '' or c.name ilike '%' || $1 || '%' or c.tagline ilike '%' || $1 || '%'
             or c.description ilike '%' || $1 || '%')
        and ($2 = '' or c.category = $2)
      group by c.id
      order by c.featured desc, c.name asc`,
    [search, category]
  );

  const categories = (await many(
    'select distinct category from charities where active = true order by category'
  )).map((r) => r.category);

  res.json({ charities, categories });
}));

/** GET /api/charities/featured — homepage spotlight. */
router.get('/featured', wrap(async (req, res) => {
  const charity = await one(
    `select c.*, coalesce(sum(cc.amount), 0)::numeric as raised
       from charities c
       left join charity_contributions cc on cc.charity_id = c.id
      where c.active = true
      group by c.id
      order by c.featured desc, random() limit 1`
  );
  res.json({ charity });
}));

/** GET /api/charities/:slug — profile page. */
router.get('/:slug', wrap(async (req, res) => {
  const charity = await one(
    `select c.*,
            coalesce(sum(cc.amount), 0)::numeric as raised,
            count(distinct u.id)::int           as supporters
       from charities c
       left join charity_contributions cc on cc.charity_id = c.id
       left join users u on u.charity_id = c.id
      where c.slug = $1 and c.active = true
      group by c.id`,
    [req.params.slug]
  );
  if (!charity) fail(404, 'That charity is not listed.');
  res.json({ charity });
}));

/** PUT /api/charities/selection — change charity or contribution percentage. */
router.put('/selection', requireAuth, wrap(async (req, res) => {
  const percent = Number(req.body.charity_percent);
  if (!Number.isFinite(percent) || percent < 10 || percent > 100) {
    fail(400, 'Contribution must be between 10% and 100% of your fee.');
  }
  const charity = await one('select id from charities where id = $1 and active = true', [
    req.body.charity_id,
  ]);
  if (!charity) fail(400, 'Choose a charity from the directory.');

  const user = await one(
    `update users set charity_id = $1, charity_percent = $2 where id = $3
     returning id, name, email, role, phone, charity_id, charity_percent, created_at`,
    [charity.id, percent, req.user.id]
  );
  res.json({ user });
}));

/** POST /api/charities/donate — one-off giving, unconnected to the draw. */
router.post('/donate', requireAuth, wrap(async (req, res) => {
  const amount = Number(req.body.amount);
  if (!Number.isFinite(amount) || amount < 50) fail(400, 'The smallest donation is ₹50.');

  const charity = await one('select id, name from charities where id = $1 and active = true', [
    req.body.charity_id,
  ]);
  if (!charity) fail(400, 'Choose a charity from the directory.');

  const donation = await one(
    `insert into charity_contributions (user_id, charity_id, amount, percent, source, period)
     values ($1, $2, $3, 100, 'donation', $4) returning *`,
    [req.user.id, charity.id, amount, periodOf()]
  );
  res.status(201).json({ donation, charity });
}));

/** GET /api/charities/me/contributions — the signed-in user's giving history. */
router.get('/me/contributions', requireAuth, wrap(async (req, res) => {
  const contributions = await many(
    `select cc.*, c.name as charity_name, c.slug as charity_slug
       from charity_contributions cc
       left join charities c on c.id = cc.charity_id
      where cc.user_id = $1 order by cc.created_at desc`,
    [req.user.id]
  );
  const total = contributions.reduce((sum, c) => sum + Number(c.amount), 0);
  res.json({ contributions, total: Math.round(total * 100) / 100 });
}));

module.exports = router;
