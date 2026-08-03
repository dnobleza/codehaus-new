/**
 * REAL SQL, REAL DATABASE. Part of the opt-in suite -- run with:
 *
 *     npm --prefix backend run test:integration
 *
 * NOT part of `npm test`. See tests/integration/README.md for why.
 *
 * WHAT THIS COVERS AND WHY THESE QUERIES
 * --------------------------------------
 * `PROJECT_WITH_CLIENT_SELECT` (projects.repository.js) and
 * `PAYMENT_WITH_CONTEXT_SELECT` (payments.repository.js) are the two highest-risk
 * pieces of untested SQL in the backend:
 *
 *   - They are the only multi-table joins on the admin read path, spanning the
 *     schema's awkward two-table identity split (`users` holds the credential,
 *     `registration` holds the person, joined on `registration_uuid`).
 *   - Bugs in exactly these joins shipped once already, during the
 *     role-separation pass, and were found by running queries by hand because
 *     the test suite could not reach a database.
 *   - Their LEFT-JOIN-ness is a deliberate correctness property, not an
 *     accident: an admin list must never silently DROP a project or a payment
 *     because a joined identity row is missing. An inner join turns a data
 *     problem into an invisible project -- and an invisible project in a
 *     payment queue is money nobody is looking at. A unit test with a mocked
 *     `pg` cannot catch that regression; only real SQL can, so the
 *     missing-join-row cases below are the single most valuable assertions in
 *     this file.
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

const projectsRepo = require('../../src/repositories/projects.repository');
const paymentsRepo = require('../../src/repositories/payments.repository');

let available = false;
let skipReason = '';

beforeAll(async () => {
  const probe = await probeDatabase();
  available = probe.ok;
  skipReason = probe.reason ?? '';
  if (!available) {
    console.warn(`\n[integration] SKIPPING repository join tests: ${skipReason}\n`);
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

// `it.skipIf` is evaluated lazily per test, so a machine with no Postgres
// reports skips instead of a cascade of connection errors.
const dbIt = (name, fn) => it(name, async (ctx) => (available ? fn(ctx) : ctx.skip()));

describe('PROJECT_WITH_CLIENT_SELECT (projects.repository)', () => {
  dbIt('findById returns the project joined to its client identity', async () => {
    const user = await insertClientUser(tx.client, { firstName: 'Ada', lastName: 'Lovelace' });
    const project = await insertProject(tx.client, { clientId: user.userId, title: 'Join Check' });

    const found = await projectsRepo.findById(project.id, tx.client);

    expect(found).not.toBeNull();
    expect(found.id).toBe(project.id);
    expect(found.title).toBe('Join Check');
    // The whole point of the join: names, not `Client #12`.
    expect(found.client_first_name).toBe('Ada');
    expect(found.client_last_name).toBe('Lovelace');
    expect(found.client_email).toBe(user.email);
  });

  /**
   * The repository comment justifies these joins being LEFT on the grounds
   * that "a project whose client row is missing or malformed must still appear
   * in an admin list with a blank name, never silently vanish".
   *
   * Writing that test is how we discovered the orphan state is NOT actually
   * representable in this schema. The FK chain forbids it end to end:
   *
   *   projects.client_id       -> users(user_id)                ON DELETE RESTRICT
   *   users.registration_uuid  -> registration(registration_uuid) ON DELETE CASCADE
   *
   * Deleting a registration cascades to delete its user, which is then RESTRICTed
   * by any project referencing it. Repointing `users.registration_uuid` at a
   * non-existent uuid is refused by `fk_registration`. So for a project that
   * exists, both joined rows are guaranteed to exist.
   *
   * The LEFT JOIN therefore stays correct but is defence-in-depth, not a live
   * code path -- worth knowing, because it means an INNER JOIN would behave
   * identically today and a future reader should not "simplify" it on that
   * basis. This test pins the FK topology that makes the guarantee hold: if
   * someone weakens one of these constraints, the LEFT JOIN stops being
   * theoretical and this test says so.
   */
  dbIt('cannot orphan a project\'s identity rows -- the FK chain forbids it', async () => {
    const user = await insertClientUser(tx.client);
    await insertProject(tx.client, { clientId: user.userId, title: 'FK Protected' });

    const { rows: fks } = await tx.client.query(
      `SELECT conrelid::regclass::text AS tbl, conname, confdeltype
       FROM pg_constraint
       WHERE contype = 'f'
         AND ((conrelid = 'projects'::regclass AND conname = 'projects_client_id_fkey')
           OR (conrelid = 'users'::regclass    AND conname = 'fk_registration'))`
    );
    const byName = Object.fromEntries(fks.map((f) => [f.conname, f.confdeltype]));
    // 'r' = RESTRICT, 'c' = CASCADE.
    expect(byName.projects_client_id_fkey).toBe('r');
    expect(byName.fk_registration).toBe('c');

    // And the repoint is genuinely refused (23503 = foreign_key_violation).
    await tx.client.query('SAVEPOINT before_orphan');
    await expect(
      tx.client.query('UPDATE users SET registration_uuid = gen_random_uuid() WHERE user_id = $1', [user.userId])
    ).rejects.toMatchObject({ code: '23503' });
    await tx.client.query('ROLLBACK TO SAVEPOINT before_orphan');
  });

  dbIt('findById returns null for a project that does not exist', async () => {
    const found = await projectsRepo.findById('00000000-0000-4000-8000-000000000000', tx.client);
    expect(found).toBeNull();
  });

  dbIt('listAll carries client identity and honours the status filter', async () => {
    const user = await insertClientUser(tx.client, { firstName: 'Grace', lastName: 'Hopper' });
    await insertProject(tx.client, { clientId: user.userId, title: 'Dev One', statusCode: 'in_development' });
    await insertProject(tx.client, { clientId: user.userId, title: 'Draft One', statusCode: 'draft' });

    const inDev = await projectsRepo.listAll({ statusCode: 'in_development' }, tx.client);
    const mine = inDev.filter((p) => String(p.client_id) === String(user.userId));

    expect(mine).toHaveLength(1);
    expect(mine[0].title).toBe('Dev One');
    expect(mine[0].client_first_name).toBe('Grace');
    expect(mine[0].client_last_name).toBe('Hopper');
  });

  dbIt('findByIdForClient deliberately omits the identity columns', async () => {
    // Client-facing reads skip the join -- a client already knows who they are.
    // Asserted so the two paths cannot silently converge.
    const user = await insertClientUser(tx.client);
    const project = await insertProject(tx.client, { clientId: user.userId });

    const found = await projectsRepo.findByIdForClient(project.id, user.userId, tx.client);

    expect(found).not.toBeNull();
    expect(found).not.toHaveProperty('client_first_name');
  });

  dbIt('findByIdForClient does not leak another client\'s project', async () => {
    const owner = await insertClientUser(tx.client);
    const stranger = await insertClientUser(tx.client);
    const project = await insertProject(tx.client, { clientId: owner.userId });

    const found = await projectsRepo.findByIdForClient(project.id, stranger.userId, tx.client);
    expect(found).toBeNull();
  });
});

describe('PAYMENT_WITH_CONTEXT_SELECT (payments.repository)', () => {
  async function seedPayment(overrides = {}) {
    const user = await insertClientUser(tx.client, { firstName: 'Alan', lastName: 'Turing' });
    const project = await insertProject(tx.client, {
      clientId: user.userId,
      title: 'Paid Project',
      referenceCode: `CH-2099-9${Math.floor(Math.random() * 900 + 100)}`,
    });
    const quotation = await insertQuotation(tx.client, { projectId: project.id });
    const installment = await insertInstallment(tx.client, {
      projectId: project.id,
      quotationId: quotation.id,
      sequence: 2,
      amount: '20000.00',
    });
    const payment = await paymentsRepo.insert(
      {
        projectId: project.id,
        paymentMethod: 'bank_transfer',
        amount: '20000.00',
        referenceNumber: 'REF-INT-1',
        status: 'verification',
        installmentId: installment.id,
        ...overrides,
      },
      tx.client
    );
    return { user, project, quotation, installment, payment };
  }

  dbIt('listAll joins project, client identity and installment sequence', async () => {
    const { user, project, payment } = await seedPayment();

    const rows = await paymentsRepo.listAll({ status: 'verification' }, tx.client);
    const row = rows.find((r) => r.id === payment.id);

    expect(row).toBeDefined();
    expect(row.project_title).toBe('Paid Project');
    expect(row.project_reference_code).toBe(project.reference_code);
    expect(row.client_first_name).toBe('Alan');
    expect(row.client_last_name).toBe('Turing');
    // "installment 2 of 5" is what makes an amount checkable against a slip.
    expect(Number(row.installment_sequence)).toBe(2);
    expect(String(row.project_id)).toBe(String(project.id));
    expect(String(user.userId)).toBeTruthy();
  });

  dbIt('keeps a payment in the queue when installment_id is null (LEFT JOIN)', async () => {
    // Payments predating 019_add_payment_installment_id.sql have no installment.
    // They must still appear in the verification queue, with a null sequence.
    const user = await insertClientUser(tx.client);
    const project = await insertProject(tx.client, { clientId: user.userId });
    const payment = await paymentsRepo.insert(
      {
        projectId: project.id,
        paymentMethod: 'gcash',
        amount: '1000.00',
        status: 'verification',
        installmentId: null,
      },
      tx.client
    );

    const rows = await paymentsRepo.listAll({ status: 'verification' }, tx.client);
    const row = rows.find((r) => r.id === payment.id);

    expect(row).toBeDefined();
    expect(row.installment_sequence).toBeNull();
    expect(row.project_title).toBeTruthy();
  });

  dbIt('listAssignedTo scopes staff to assigned projects only', async () => {
    const { payment, project } = await seedPayment();
    const staff = await insertClientUser(tx.client, { role: 'STAFF' });
    const other = await insertClientUser(tx.client, { role: 'STAFF' });

    await tx.client.query(
      'INSERT INTO project_assignments (project_id, user_id, assigned_by) VALUES ($1,$2,$3)',
      [project.id, staff.userId, staff.userId]
    );

    const assigned = await paymentsRepo.listAssignedTo(staff.userId, {}, tx.client);
    expect(assigned.map((r) => r.id)).toContain(payment.id);

    // The scoping is in the JOIN predicate, so an unassigned staff member
    // cannot reach the row at all.
    const unassigned = await paymentsRepo.listAssignedTo(other.userId, {}, tx.client);
    expect(unassigned.map((r) => r.id)).not.toContain(payment.id);
  });
});
