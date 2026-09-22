const jwt = require('jsonwebtoken');
const { one } = require('../db');

const SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-me';
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const signToken = (user) =>
  jwt.sign({ sub: user.id, role: user.role }, SECRET, { expiresIn: EXPIRES_IN });

/**
 * Looks up the caller's live subscription. The PRD asks for a real-time
 * subscription check on every authenticated request, so this runs per request
 * and lazily expires anything past its period end.
 */
async function currentSubscription(userId) {
  await one(
    `update subscriptions set status = 'expired'
      where user_id = $1 and status = 'active' and current_period_end <= now()
      returning id`,
    [userId]
  );
  return one(
    `select * from subscriptions
      where user_id = $1 and status = 'active' and current_period_end > now()
      order by current_period_end desc limit 1`,
    [userId]
  );
}

/** Requires a valid bearer token. Attaches req.user and req.subscription. */
async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Sign in to continue.' });

    const payload = jwt.verify(token, SECRET);
    const user = await one(
      `select id, name, email, role, phone, charity_id, charity_percent, created_at
         from users where id = $1`,
      [payload.sub]
    );
    if (!user) return res.status(401).json({ error: 'This account no longer exists.' });

    req.user = user;
    req.subscription = await currentSubscription(user.id);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Your session expired. Sign in again.' });
  }
}

/** Admin-only guard. Use after requireAuth. */
function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Administrator access only.' });
  }
  next();
}

/** Subscriber-only guard: gates scores, draws and winnings. */
function requireSubscription(req, res, next) {
  if (req.user?.role === 'admin') return next();
  if (!req.subscription) {
    return res
      .status(402)
      .json({ error: 'An active subscription is needed for this.', code: 'NO_SUBSCRIPTION' });
  }
  next();
}

module.exports = { signToken, requireAuth, requireAdmin, requireSubscription, currentSubscription };
