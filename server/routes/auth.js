const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { one } = require('../db');
const { signToken, requireAuth } = require('../middleware/auth');
const { wrap, fail, isEmail, publicUser } = require('../utils/helpers');

/** POST /api/auth/register */
router.post('/register', wrap(async (req, res) => {
  const name = (req.body.name || '').trim();
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';

  if (name.length < 2) fail(400, 'Enter your full name.');
  if (!isEmail(email)) fail(400, 'Enter a valid email address.');
  if (password.length < 8) fail(400, 'Use a password of at least 8 characters.');

  const existing = await one('select id from users where email = $1', [email]);
  if (existing) fail(409, 'An account already uses this email. Sign in instead.');

  const hash = await bcrypt.hash(password, 10);
  const user = await one(
    `insert into users (name, email, password_hash, charity_id, charity_percent)
     values ($1, $2, $3, $4, $5)
     returning id, name, email, role, phone, charity_id, charity_percent, created_at`,
    [name, email, hash, req.body.charity_id || null, Number(req.body.charity_percent) || 10]
  );

  res.status(201).json({ token: signToken(user), user: publicUser(user) });
}));

/** POST /api/auth/login */
router.post('/login', wrap(async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';

  const user = await one('select * from users where email = $1', [email]);
  if (!user) fail(401, 'No account matches that email and password.');

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) fail(401, 'No account matches that email and password.');

  res.json({ token: signToken(user), user: publicUser(user) });
}));

/** GET /api/auth/me — user, live subscription state and charity. */
router.get('/me', requireAuth, wrap(async (req, res) => {
  const charity = req.user.charity_id
    ? await one('select id, name, slug, image_url, category from charities where id = $1', [req.user.charity_id])
    : null;

  res.json({
    user: req.user,
    subscription: req.subscription,
    charity,
    isSubscribed: Boolean(req.subscription),
  });
}));

/** PATCH /api/auth/me — profile and password. */
router.patch('/me', requireAuth, wrap(async (req, res) => {
  const { name, phone, password, current_password } = req.body;
  const updates = [];
  const values = [];
  let i = 1;

  if (name !== undefined) {
    if (String(name).trim().length < 2) fail(400, 'Enter your full name.');
    updates.push(`name = $${i++}`); values.push(String(name).trim());
  }
  if (phone !== undefined) { updates.push(`phone = $${i++}`); values.push(phone || null); }

  if (password) {
    if (password.length < 8) fail(400, 'Use a password of at least 8 characters.');
    const row = await one('select password_hash from users where id = $1', [req.user.id]);
    const ok = await bcrypt.compare(current_password || '', row.password_hash);
    if (!ok) fail(400, 'Your current password is not correct.');
    updates.push(`password_hash = $${i++}`); values.push(await bcrypt.hash(password, 10));
  }

  if (!updates.length) return res.json({ user: req.user });

  values.push(req.user.id);
  const user = await one(
    `update users set ${updates.join(', ')} where id = $${i}
     returning id, name, email, role, phone, charity_id, charity_percent, created_at`,
    values
  );
  res.json({ user });
}));

module.exports = router;
