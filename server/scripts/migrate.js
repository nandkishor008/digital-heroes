/**
 * Applies db/schema.sql. Safe to re-run — every statement is idempotent.
 *   npm run db:migrate
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../db');

(async () => {
  const sql = fs.readFileSync(path.join(__dirname, '..', '..', 'db', 'schema.sql'), 'utf8');
  try {
    await pool.query(sql);
    console.log('Schema applied.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
