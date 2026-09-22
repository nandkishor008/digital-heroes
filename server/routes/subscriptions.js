const router = require('express').Router();
const { one, many, tx } = require('../db');
const { requireAuth, currentSubscription } = require('../middleware/auth');
const { wrap, fail, allSettings, periodOf } = require('../utils/helpers');

const PLANS = {
  monthly: { id: 'monthly', label: 'Monthly', months: 1 },
  yearly: { id: 'yearly', label: 'Yearly', months: 12 },
};

/** Stripe is optional: without a key the platform runs a demo checkout. */
function stripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  try {
    // eslint-disable-next-line global-require
    return require('stripe')(process.env.STRIPE_SECRET_KEY);
  } catch (err) {
    console.warn('[payments] stripe package unavailable, falling back to demo checkout');
    return null;
  }
}

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

/** GET /api/subscriptions/plans — public pricing. */
router.get('/plans', wrap(async (req, res) => {
  const settings = await allSettings();
  const prices = settings.plan_prices;
  const monthlyYearEquivalent = prices.monthly * 12;
  res.json({
    currency: 'INR',
    provider: process.env.STRIPE_SECRET_KEY ? 'stripe' : 'demo',
    prizePoolPercent: Number(settings.prize_pool_percent),
    plans: [
      {
        ...PLANS.monthly,
        price: prices.monthly,
        billed: 'every month',
        perMonth: prices.monthly,
      },
      {
        ...PLANS.yearly,
        price: prices.yearly,
        billed: 'once a year',
        perMonth: Math.round(prices.yearly / 12),
        savings: monthlyYearEquivalent - prices.yearly,
      },
    ],
  });
}));

router.use(requireAuth);

/** GET /api/subscriptions/me — current plus history. */
router.get('/me', wrap(async (req, res) => {
  const history = await many(
    'select * from subscriptions where user_id = $1 order by created_at desc',
    [req.user.id]
  );
  res.json({ subscription: req.subscription, history });
}));

/**
 * POST /api/subscriptions/checkout
 * With a Stripe key this returns a Checkout URL; without one it activates the
 * plan immediately so the flow stays fully testable in the demo deployment.
 */
router.post('/checkout', wrap(async (req, res) => {
  const plan = PLANS[req.body.plan];
  if (!plan) fail(400, 'Choose the monthly or the yearly plan.');

  const settings = await allSettings();
  const amount = Number(settings.plan_prices[plan.id]);
  const charityPercent = Math.min(100, Math.max(10, Number(req.body.charity_percent) || req.user.charity_percent || 10));
  const charityId = req.body.charity_id || req.user.charity_id;
  if (!charityId) fail(400, 'Choose the charity your contribution supports.');

  const stripe = stripeClient();
  if (stripe) {
    const origin = req.headers.origin || process.env.PUBLIC_URL || '';
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: req.user.email,
      line_items: [{
        price_data: {
          currency: 'inr',
          unit_amount: Math.round(amount * 100),
          product_data: { name: `Digital Heroes — ${plan.label} membership` },
        },
        quantity: 1,
      }],
      metadata: { user_id: req.user.id, plan: plan.id, charity_id: charityId, charity_percent: charityPercent },
      success_url: `${origin}/subscription?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/subscription?cancelled=1`,
    });
    return res.json({ provider: 'stripe', checkoutUrl: session.url, sessionId: session.id });
  }

  const activated = await activate({
    userId: req.user.id, plan, amount, charityId, charityPercent,
    provider: 'demo', providerRef: `demo_${Date.now()}`,
  });
  res.json({ provider: 'demo', subscription: activated, activated: true });
}));

/**
 * POST /api/subscriptions/confirm — completes a Stripe checkout session.
 */
router.post('/confirm', wrap(async (req, res) => {
  const stripe = stripeClient();
  if (!stripe) fail(400, 'This deployment uses demo checkout; nothing to confirm.');

  const session = await stripe.checkout.sessions.retrieve(req.body.session_id);
  if (!session || session.payment_status !== 'paid') fail(400, 'That payment has not completed.');
  if (session.metadata.user_id !== req.user.id) fail(403, 'That payment belongs to another account.');

  const existing = await one('select id from subscriptions where provider_ref = $1', [session.id]);
  if (existing) return res.json({ subscription: await currentSubscription(req.user.id), alreadyProcessed: true });

  const plan = PLANS[session.metadata.plan];
  const subscription = await activate({
    userId: req.user.id,
    plan,
    amount: session.amount_total / 100,
    charityId: session.metadata.charity_id,
    charityPercent: Number(session.metadata.charity_percent),
    provider: 'stripe',
    providerRef: session.id,
  });
  res.json({ subscription });
}));

/**
 * Creates the subscription, stores the charity split and records the
 * contribution ledger entry — all in one transaction.
 */
async function activate({ userId, plan, amount, charityId, charityPercent, provider, providerRef }) {
  return tx(async (client) => {
    await client.query(
      `update subscriptions set status = 'cancelled', cancelled_at = now()
        where user_id = $1 and status = 'active'`,
      [userId]
    );

    const { rows } = await client.query(
      `insert into subscriptions
         (user_id, plan, amount, status, provider, provider_ref, current_period_end)
       values ($1, $2, $3, 'active', $4, $5, $6) returning *`,
      [userId, plan.id, amount, provider, providerRef, addMonths(new Date(), plan.months)]
    );
    const subscription = rows[0];

    await client.query(
      'update users set charity_id = $1, charity_percent = $2 where id = $3',
      [charityId, charityPercent, userId]
    );

    const contribution = Math.round(((amount * charityPercent) / 100) * 100) / 100;
    await client.query(
      `insert into charity_contributions
         (user_id, charity_id, subscription_id, amount, percent, source, period)
       values ($1, $2, $3, $4, $5, 'subscription', $6)`,
      [userId, charityId, subscription.id, contribution, charityPercent, periodOf()]
    );

    return subscription;
  });
}

/** POST /api/subscriptions/cancel — stays active until the period ends. */
router.post('/cancel', wrap(async (req, res) => {
  if (!req.subscription) fail(400, 'There is no active subscription to cancel.');
  const subscription = await one(
    `update subscriptions set cancel_at_period_end = true, cancelled_at = now()
      where id = $1 returning *`,
    [req.subscription.id]
  );
  res.json({ subscription });
}));

/** POST /api/subscriptions/resume — undoes a pending cancellation. */
router.post('/resume', wrap(async (req, res) => {
  if (!req.subscription) fail(400, 'There is no subscription to resume.');
  const subscription = await one(
    `update subscriptions set cancel_at_period_end = false, cancelled_at = null
      where id = $1 returning *`,
    [req.subscription.id]
  );
  res.json({ subscription });
}));

module.exports = router;
module.exports.activate = activate;
module.exports.PLANS = PLANS;
