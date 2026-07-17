const { Pool } = require('pg');
const logger = require('../utils/logger');
const TAG = '[DATABASE]';

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
