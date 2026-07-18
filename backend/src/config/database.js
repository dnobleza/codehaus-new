const { Pool, types } = require('pg');
const logger = require('../utils/logger');
const TAG = '[DATABASE]';

// DATE columns (oid 1082) default to parsing into a JS Date at LOCAL
// midnight, which then serializes to JSON via toISOString() shifted by the
// server's timezone offset -- e.g. a due_date of 2026-07-18 comes back as
// "2026-07-17T16:00:00.000Z" on a UTC+8 server. Every consumer of a DATE
// column in this codebase (payment_installments.due_date today) expects a
// plain 'YYYY-MM-DD' string, not a timezone-shifted timestamp -- return the
// raw string pg already has instead of letting it construct a Date.
types.setTypeParser(1082, (value) => value);

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 3000,
  connectionTimeoutMillis: 5000,
});

pool.on('connect', () => {
  logger.info(`${TAG} Connected to Database`);
});

pool.on('error', (err) => {
  logger.error(`${TAG} ${err.message}`);
});

module.exports = pool;
