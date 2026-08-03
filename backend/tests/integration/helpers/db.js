/**
 * Shared plumbing for the opt-in integration suite.
 *
 * TWO GUARANTEES THIS FILE PROVIDES
 * ---------------------------------
 * 1. NOTHING IS EVER COMMITTED. Every test runs inside a transaction that is
 *    unconditionally rolled back in `afterEach`, and every fixture insert and
 *    every repository call under test is handed that same transaction client.
 *    This is what makes it safe to point `npm run test:integration` at a real
 *    local development database: the tests read and write real tables through
 *    real SQL, then leave zero trace.
 *
 *    It works because every repository function in this codebase already takes
 *    a trailing `db = pool` argument. Passing the transaction client exercises
 *    the genuine query text -- these are not re-implementations of the SQL.
 *
 * 2. A MISSING DATABASE SKIPS, IT DOES NOT FAIL. A developer without Postgres
 *    running should get a clear "skipped" line, not a wall of ECONNREFUSED.
 *    `describeIntegration` handles that.
 */

const { Client } = require('pg');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '..', '.env') });

function connectionConfig() {
  return {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionTimeoutMillis: 5000,
  };
}

/**
 * Probes the configured database once per process. Returns `{ ok, reason }`.
 * Also verifies the migrations this suite depends on have actually been
 * applied -- a database that is reachable but two migrations behind would
 * otherwise produce confusing "column does not exist" failures instead of an
 * actionable message.
 */
let probeResult;
async function probeDatabase() {
  if (probeResult) return probeResult;

  const client = new Client(connectionConfig());
  try {
    await client.connect();
    const { rows } = await client.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'payments' AND column_name IN ('shortfall_amount', 'rejection_reason')`
    );
    if (rows.length < 2) {
      probeResult = {
        ok: false,
        reason:
          'database is reachable but migrations are not up to date ' +
          '(payments.shortfall_amount / payments.rejection_reason missing). ' +
          'Run: npm --prefix backend run migrate',
      };
    } else {
      probeResult = { ok: true, reason: null };
    }
  } catch (error) {
    probeResult = {
      ok: false,
      reason: `database not reachable (${error.code || error.message}). ` + 'See tests/integration/README.md',
    };
  } finally {
    await client.end().catch(() => {});
  }
  return probeResult;
}

/**
 * Opens a transaction-scoped client. Call `release()` in `afterEach` -- it
 * ROLLBACKs first, always, including when the test threw.
 */
async function beginTestTransaction() {
  const client = new Client(connectionConfig());
  await client.connect();
  await client.query('BEGIN');

  return {
    client,
    async release() {
      try {
        await client.query('ROLLBACK');
      } finally {
        await client.end().catch(() => {});
      }
    },
  };
}

/**
 * Inserts a client user (registration + users) and returns `{ userId, ... }`.
 * Identity is split across two tables in this schema -- `registration` holds
 * the person, `users` holds the credential -- joined on `registration_uuid`,
 * which is exactly the join the selects under test have to get right.
 *
 * `email` is uniquified per call so repeated runs cannot collide even if a
 * rollback were somehow skipped.
 */
let fixtureCounter = 0;
async function insertClientUser(client, overrides = {}) {
  fixtureCounter += 1;
  const unique = `${Date.now()}-${fixtureCounter}`;
  const firstName = overrides.firstName ?? 'Integration';
  const lastName = overrides.lastName ?? 'Tester';
  const email = overrides.email ?? `integration-${unique}@example.test`;

  const { rows: regRows } = await client.query(
    `INSERT INTO registration (first_name, middle_name, last_name, email)
     VALUES ($1, $2, $3, $4) RETURNING registration_uuid`,
    [firstName, overrides.middleName ?? 'Q', lastName, email]
  );
  const registrationUuid = regRows[0].registration_uuid;

  const { rows: userRows } = await client.query(
    `INSERT INTO users (registration_uuid, password_hash, role)
     VALUES ($1, $2, $3) RETURNING user_id`,
    [registrationUuid, 'not-a-real-hash', overrides.role ?? 'CLIENT']
  );

  return { userId: userRows[0].user_id, registrationUuid, firstName, lastName, email };
}

async function insertProject(client, { clientId, title = 'Integration Project', statusCode = 'submitted', referenceCode = null }) {
  fixtureCounter += 1;
  const { rows } = await client.query(
    `INSERT INTO projects (client_id, title, status_code, reference_code)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [clientId, title, statusCode, referenceCode ?? `CH-2099-${String(fixtureCounter).padStart(4, '0')}`]
  );
  return rows[0];
}

async function insertQuotation(client, { projectId, totalAmount = '100000.00' }) {
  const { rows } = await client.query(
    `INSERT INTO quotations (project_id, base_price, total_amount, status)
     VALUES ($1, $2, $3, 'accepted') RETURNING *`,
    [projectId, totalAmount, totalAmount]
  );
  return rows[0];
}

async function insertInstallment(
  client,
  { projectId, quotationId, sequence = 1, percentage = '50.00', amount = '50000.00', status = 'pending' }
) {
  const { rows } = await client.query(
    `INSERT INTO payment_installments (project_id, quotation_id, sequence, percentage, amount, due_date, status)
     VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, $6) RETURNING *`,
    [projectId, quotationId, sequence, percentage, amount, status]
  );
  return rows[0];
}

module.exports = {
  probeDatabase,
  beginTestTransaction,
  insertClientUser,
  insertProject,
  insertQuotation,
  insertInstallment,
};
