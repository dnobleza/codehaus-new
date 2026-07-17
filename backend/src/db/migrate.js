const fs = require('fs');
const path = require('path');

if (require.main === module) {
  require('dotenv').config();
}

const pool = require('../config/database');
const logger = require('../utils/logger');
const TAG = '[MIGRATE]';

const MIGRATIONS_DIR = path.join(__dirname, '..', '..', 'db', 'migrations');

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

async function runMigrations() {
  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);

    const { rows } = await client.query('SELECT name FROM schema_migrations');
    const applied = new Set(rows.map((row) => row.name));

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (applied.has(file)) continue;

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      logger.info(`${TAG} Applying ${file}`);

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }

    logger.info(`${TAG} Up to date`);
  } finally {
    client.release();
  }
}

module.exports = runMigrations;

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((error) => {
      logger.error(`${TAG} ${error.message}`);
      process.exit(1);
    });
}
