const { one, many } = require('../db');

/** Wraps an async route so rejected promises reach the error handler. */
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** Throwable API error with a status code. */
class ApiError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
const fail = (status, message, code) => { throw new ApiError(status, message, code); };

/** 'YYYY-MM' for a given date (defaults to today). */
function periodOf(date = new Date()) {
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** The period after the given one. */
function nextPeriod(period) {
  const [y, m] = period.split('-').map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
}

/** Last calendar day of a period, as an ISO date string. */
function periodEndDate(period) {
  const [y, m] = period.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

/** Reads a settings row, falling back to the supplied default. */
async function getSetting(key, fallback) {
  const row = await one('select value from settings where key = $1', [key]);
  return row ? row.value : fallback;
}

async function setSetting(key, value) {
  await one(
    `insert into settings (key, value) values ($1, $2::jsonb)
       on conflict (key) do update set value = excluded.value returning key`,
    [key, JSON.stringify(value)]
  );
  return value;
}

async function allSettings() {
  const rows = await many('select key, value from settings');
  const out = {};
  for (const r of rows) out[r.key] = r.value;
  return {
    prize_pool_percent: 30,
    draw_method: 'random',
    plan_prices: { monthly: 499, yearly: 4999 },
    ...out,
  };
}

/** Strips the password hash before a user object leaves the API. */
const publicUser = (u) => {
  if (!u) return null;
  const { password_hash, ...rest } = u;
  return rest;
};

const isEmail = (v) => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const isIsoDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

module.exports = {
  wrap, ApiError, fail, periodOf, nextPeriod, periodEndDate,
  getSetting, setSetting, allSettings, publicUser, isEmail, isIsoDate,
};
