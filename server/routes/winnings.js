const router = require('express').Router();
const { one, many } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { wrap, fail } = require('../utils/helpers');

const MAX_PROOF_BYTES = 4 * 1024 * 1024; // ~4 MB screenshot

router.use(requireAuth);

/** GET /api/winnings/me — every win plus its verification and payout state. */
router.get('/me', wrap(async (req, res) => {
  const winnings = await many(
    `select w.*, d.period, d.winning_numbers, d.draw_date
       from winnings w join draws d on d.id = w.draw_id
      where w.user_id = $1 order by d.period desc`,
    [req.user.id]
  );

  const totals = winnings.reduce(
    (acc, w) => {
      acc.total += Number(w.amount);
      if (w.payment_status === 'paid') acc.paid += Number(w.amount);
      else if (w.verification_status === 'approved') acc.awaitingPayment += Number(w.amount);
      else if (w.verification_status !== 'rejected') acc.awaitingVerification += Number(w.amount);
      return acc;
    },
    { total: 0, paid: 0, awaitingPayment: 0, awaitingVerification: 0 }
  );

  res.json({ winnings, totals });
}));

/**
 * POST /api/winnings/:id/proof
 * The winner uploads a screenshot of their scores from the golf platform.
 * It is stored as a data URL so the demo needs no object storage bucket.
 */
router.post('/:id/proof', wrap(async (req, res) => {
  const winning = await one('select * from winnings where id = $1 and user_id = $2', [
    req.params.id, req.user.id,
  ]);
  if (!winning) fail(404, 'That win is not on your account.');
  if (winning.verification_status === 'approved') fail(400, 'This win is already verified.');

  const proof = req.body.proof_url;
  if (typeof proof !== 'string' || !proof.startsWith('data:image/')) {
    fail(400, 'Upload a PNG or JPG screenshot of your scores.');
  }
  if (proof.length > MAX_PROOF_BYTES * 1.4) fail(413, 'That image is over 4 MB. Upload a smaller one.');

  const updated = await one(
    `update winnings set proof_url = $1, proof_note = $2,
            verification_status = 'submitted', review_note = null,
            reviewed_by = null, reviewed_at = null
      where id = $3 returning *`,
    [proof, (req.body.note || '').slice(0, 500), winning.id]
  );
  res.json({ winning: updated });
}));

module.exports = router;
