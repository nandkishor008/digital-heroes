require('dotenv').config();

const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || true, credentials: false }));
app.use(express.json({ limit: '6mb' }));      // proof screenshots arrive as data URLs
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) =>
  res.json({ ok: true, service: 'digital-heroes', time: new Date().toISOString() })
);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/scores', require('./routes/scores'));
app.use('/api/charities', require('./routes/charities'));
app.use('/api/draws', require('./routes/draws'));
app.use('/api/winnings', require('./routes/winnings'));
app.use('/api/admin', require('./routes/admin'));

app.use('/api', (req, res) => res.status(404).json({ error: 'That endpoint does not exist.' }));

// In a single-server deployment the built client is served from the same origin.
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

// Central error handler: known failures keep their message, everything else is
// logged and answered generically.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.status) return res.status(err.status).json({ error: err.message, code: err.code });

  if (err.code === '23505') {
    return res.status(409).json({ error: 'That record already exists.', code: 'DUPLICATE' });
  }
  if (err.code === '23503') {
    return res.status(400).json({ error: 'A linked record is missing.', code: 'FK' });
  }
  if (err.code === '23514') {
    return res.status(400).json({ error: 'A value is outside its allowed range.', code: 'CHECK' });
  }

  console.error('[api]', err);
  res.status(500).json({ error: 'Something broke on our side. Try again in a moment.' });
});

module.exports = app;
