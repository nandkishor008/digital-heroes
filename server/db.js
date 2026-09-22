/**
 * Single shared Postgres pool. Works against Supabase (pooler connection
 * string) or any other Postgres instance.
 */
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.warn('[db] DATABASE_URL is not set — the API will fail on first query.');
}

const pool = new Pool({
  connectionString,
  // Supabase requires TLS; it uses a certificate chain Node does not ship with.
  ssl: process.env.PGSSL === 'disable' ? false : { rejectUnauthorized: false },
  max: Number(process.env.PG_POOL_MAX || 8),
  idleTimeoutMillis: 20000,
});

pool.on('error', (err) => console.error('[db] idle client error', err.message));

/** Run a query and return the pg result. */
const query = (text, params) => pool.query(text, params);

/** Run a query and return the first row (or null). */
const one = async (text, params) => (await pool.query(text, params)).rows[0] || null;

/** Run a query and return all rows. */
const many = async (text, params) => (await pool.query(text, params)).rows;

/** Run several statements inside a transaction. */
async function tx(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, one, many, tx };
