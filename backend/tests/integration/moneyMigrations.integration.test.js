/**
 * REAL SQL, REAL DATABASE. Opt-in suite: `npm --prefix backend run test:integration`.
 *
 * Covers the money-related migrations from the payment-shortfall pass --
 * 027_add_payment_shortfall_amount.sql and 028_add_payment_rejection_reason.sql --
 * at the level a unit test structurally cannot reach: the DEFAULTS, the
 * NOT NULL, and above all the CHECK CONSTRAINT.
 *
 * `payments_shortfall_amount_non_negative` encodes a scope boundary in the
 * database itself: an overpayment is a refund/credit-note problem with
 * different accounting and must never be REPRESENTABLE as a negative shortfall.
 * The service layer refuses it too, but a constraint that has never been fired
 * is a constraint nobody knows works -- and this one is the last line of defence
 * on a money column.
 *
 * Every test runs in a transaction that is always rolled back.
 */

// Vitest's API must be imported as ESM; the backend itself is CommonJS, so the
// modules under test are pulled in through `createRequire` -- the same pattern
// tests/env.test.js already uses.
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const {
  probeDatabase,
  beginTestTransaction,
  insertClientUser,
  insertProject,
  insertQuotation,
  insertInstallment,
} = require('./helpers/db');

const paymentsRepo = require('../../src/repositories/payments.repository');

let available = false;

beforeAll(async () => {
  const probe = await probeDatabase();
  available = probe.ok;
  if (!available) {
    console.warn(`\n[integration] SKIPPING money migration tests: ${probe.reason}\n`);
  }
});

let tx;
beforeEach(async () => {
  if (!available) return;
  tx = await beginTestTransaction();
});
afterEach(async () => {
  if (tx) await tx.release();
  tx = null;
});

const dbIt = (name, fn) => it(name, async (ctx) => (available ? fn(ctx) : ctx.skip()));

async function seedProject() {
  const user = await insertClientUser(tx.client);
  const project = await insertProject(tx.client, { clientId: user.userId });
  const quotation = await insertQuotation(tx.client, { projectId: project.id });
  const installment = await insertInstallment(tx.client, {
    projectId: project.id,
    quotationId: quotation.id,
    amount: '100000.00',
  });
  return { user, project, quotation, installment };
}

describe('027 payments.shortfall_amount', () => {
  dbIt('the column exists as NOT NULL NUMERIC defaulting to 0', async () => {
    const { rows } = await tx.client.query(
      `SELECT data_type, is_nullable, numeric_precision, numeric_scale
       FROM information_schema.columns
       WHERE table_name = 'payments' AND column_name = 'shortfall_amount'`
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].data_type).toBe('numeric');
    expect(rows[0].is_nullable).toBe('NO');
    expect(rows[0].numeric_precision).toBe(12);
    expect(rows[0].numeric_scale).toBe(2);
  });

  dbIt('defaults to 0.00 for a caller that knows nothing about shortfalls', async () => {
    const { project, installment } = await seedProject();
    const payment = await paymentsRepo.insert(
      {
        projectId: project.id,
        paymentMethod: 'bank_transfer',
        amount: '100000.00',
        status: 'verification',
        installmentId: installment.id,
        // shortfallAmount deliberately omitted.
      },
      tx.client
    );
    // NUMERIC arrives from `pg` as a STRING -- asserted as such on purpose.
    // Comparing money as a float is the bug class this whole pass exists to
    // avoid, and a test that did `toBe(0)` would quietly bless it.
    expect(typeof payment.shortfall_amount).toBe('string');
    expect(Number(payment.shortfall_amount)).toBe(0);
  });

  dbIt('persists a withholding-tax shortfall exactly, with no float drift', async () => {
    const { project, installment } = await seedProject();
    // The canonical 2% EWT case: ₱100,000 due, ₱98,000 remitted.
    const payment = await paymentsRepo.insert(
      {
        projectId: project.id,
        paymentMethod: 'bank_transfer',
        amount: '98000.00',
        status: 'verification',
        installmentId: installment.id,
        shortfallAmount: '2000.00',
      },
      tx.client
    );
    expect(payment.shortfall_amount).toBe('2000.00');

    const reread = await paymentsRepo.findById(payment.id, tx.client);
    expect(reread.shortfall_amount).toBe('2000.00');
    // Amount + shortfall reconciles to the installment due amount.
    expect(Number(reread.amount) + Number(reread.shortfall_amount)).toBe(Number(installment.amount));
  });

  dbIt('the CHECK constraint refuses a negative shortfall', async () => {
    const { project, installment } = await seedProject();

    // A SAVEPOINT is required: the failed statement aborts the surrounding
    // transaction, and later assertions/rollback would then error out.
    await tx.client.query('SAVEPOINT before_bad_insert');
    await expect(
      paymentsRepo.insert(
        {
          projectId: project.id,
          paymentMethod: 'bank_transfer',
          amount: '110000.00',
          status: 'verification',
          installmentId: installment.id,
          shortfallAmount: '-10000.00',
        },
        tx.client
      )
      // 23514 = check_violation.
    ).rejects.toMatchObject({ code: '23514', constraint: 'payments_shortfall_amount_non_negative' });
    await tx.client.query('ROLLBACK TO SAVEPOINT before_bad_insert');

    // The transaction is still usable, proving the rollback-per-test contract.
    const { rows } = await tx.client.query('SELECT 1 AS ok');
    expect(rows[0].ok).toBe(1);
  });
});

describe('028 payments.rejection_reason', () => {
  dbIt('is nullable, so historical rejections need no fabricated backfill', async () => {
    const { rows } = await tx.client.query(
      `SELECT data_type, is_nullable FROM information_schema.columns
       WHERE table_name = 'payments' AND column_name = 'rejection_reason'`
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].data_type).toBe('text');
    expect(rows[0].is_nullable).toBe('YES');
  });

  dbIt('repository.reject writes status and reason as one indivisible fact', async () => {
    const { project, installment } = await seedProject();
    const payment = await paymentsRepo.insert(
      {
        projectId: project.id,
        paymentMethod: 'gcash',
        amount: '100000.00',
        status: 'verification',
        installmentId: installment.id,
      },
      tx.client
    );
    expect(payment.rejection_reason).toBeNull();

    const rejected = await paymentsRepo.reject(
      payment.id,
      { verifiedBy: null, verifiedAt: new Date(), reason: 'Proof of payment screenshot is unreadable' },
      tx.client
    );

    // The status is hard-coded in the SQL, so a reason can never be written
    // onto a payment that isn't actually rejected.
    expect(rejected.status).toBe('rejected');
    expect(rejected.rejection_reason).toBe('Proof of payment screenshot is unreadable');
  });
});

describe('migration bookkeeping', () => {
  dbIt('027 and 028 are recorded as applied', async () => {
    const { rows } = await tx.client.query(
      `SELECT name FROM schema_migrations
       WHERE name IN ('027_add_payment_shortfall_amount.sql', '028_add_payment_rejection_reason.sql')`
    );
    expect(rows).toHaveLength(2);
  });

  dbIt('every migration file on disk has been applied to this database', async () => {
    // Catches the exact drift this environment was actually in: the local
    // database sat at 026 while the migrations directory contained 028.
    const fs = require('fs');
    const path = require('path');
    const files = fs
      .readdirSync(path.join(__dirname, '..', '..', 'db', 'migrations'))
      .filter((f) => f.endsWith('.sql'))
      .sort();

    const { rows } = await tx.client.query('SELECT name FROM schema_migrations');
    const applied = new Set(rows.map((r) => r.name));
    const missing = files.filter((f) => !applied.has(f));

    expect(missing, `unapplied migrations -- run: npm --prefix backend run migrate`).toEqual([]);
  });
});
