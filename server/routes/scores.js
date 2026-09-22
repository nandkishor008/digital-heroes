const router = require('express').Router();
const { one, many, tx } = require('../db');
const { requireAuth, requireSubscription } = require('../middleware/auth');
const { wrap, fail, isIsoDate } = require('../utils/helpers');

const MAX_RETAINED = 5;

router.use(requireAuth);

/** GET /api/scores — the retained five, newest first. */
router.get('/', wrap(async (req, res) => {
  const scores = await many(
    `select id, score, played_on, created_at from scores
      where user_id = $1 order by played_on desc limit ${MAX_RETAINED}`,
    [req.user.id]
  );
  res.json({ scores, retained: MAX_RETAINED, complete: scores.length === MAX_RETAINED });
}));

function validate(body) {
  const score = Number(body.score);
  const playedOn = body.played_on;
  if (!Number.isInteger(score) || score < 1 || score > 45) {
    fail(400, 'A Stableford score must be a whole number between 1 and 45.');
  }
  if (!isIsoDate(playedOn)) fail(400, 'Pick the date the round was played.');
  if (new Date(playedOn) > new Date(new Date().toISOString().slice(0, 10))) {
    fail(400, 'That round is in the future. Pick a date up to today.');
  }
  return { score, playedOn };
}

/**
 * POST /api/scores — add a round.
 * One entry per date, and once six exist the oldest is dropped so exactly five
 * are retained.
 */
router.post('/', requireSubscription, wrap(async (req, res) => {
  const { score, playedOn } = validate(req.body);

  const clash = await one('select id from scores where user_id = $1 and played_on = $2', [
    req.user.id, playedOn,
  ]);
  if (clash) {
    fail(409, 'You already have a score for that date. Edit or delete it instead.', 'DUPLICATE_DATE');
  }

  const result = await tx(async (client) => {
    const { rows } = await client.query(
      `insert into scores (user_id, score, played_on) values ($1, $2, $3)
       returning id, score, played_on, created_at`,
      [req.user.id, score, playedOn]
    );

    // Keep only the latest five: anything outside the newest five is removed.
    const { rows: dropped } = await client.query(
      `delete from scores where id in (
         select id from scores where user_id = $1
         order by played_on desc, created_at desc offset ${MAX_RETAINED}
       ) returning id, score, played_on`,
      [req.user.id]
    );

    const { rows: kept } = await client.query(
      `select id, score, played_on, created_at from scores
        where user_id = $1 order by played_on desc limit ${MAX_RETAINED}`,
      [req.user.id]
    );
    return { created: rows[0], dropped, scores: kept };
  });

  res.status(201).json(result);
}));

/** PATCH /api/scores/:id — edit a retained round. */
router.patch('/:id', requireSubscription, wrap(async (req, res) => {
  const { score, playedOn } = validate(req.body);

  const existing = await one('select * from scores where id = $1 and user_id = $2', [
    req.params.id, req.user.id,
  ]);
  if (!existing) fail(404, 'That score is not on your card.');

  const clash = await one(
    'select id from scores where user_id = $1 and played_on = $2 and id <> $3',
    [req.user.id, playedOn, req.params.id]
  );
  if (clash) fail(409, 'Another score already uses that date.', 'DUPLICATE_DATE');

  const updated = await one(
    `update scores set score = $1, played_on = $2 where id = $3 and user_id = $4
     returning id, score, played_on, created_at`,
    [score, playedOn, req.params.id, req.user.id]
  );

  const scores = await many(
    `select id, score, played_on, created_at from scores
      where user_id = $1 order by played_on desc limit ${MAX_RETAINED}`,
    [req.user.id]
  );
  res.json({ updated, scores });
}));

/** DELETE /api/scores/:id */
router.delete('/:id', requireSubscription, wrap(async (req, res) => {
  const removed = await one('delete from scores where id = $1 and user_id = $2 returning id', [
    req.params.id, req.user.id,
  ]);
  if (!removed) fail(404, 'That score is not on your card.');

  const scores = await many(
    `select id, score, played_on, created_at from scores
      where user_id = $1 order by played_on desc limit ${MAX_RETAINED}`,
    [req.user.id]
  );
  res.json({ removed: removed.id, scores });
}));

module.exports = router;
