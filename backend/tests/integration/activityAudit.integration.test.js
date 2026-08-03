/**
 * REAL SQL, REAL DATABASE. Opt-in suite: `npm --prefix backend run test:integration`.
 *
 * The financial/commercial audit trail (issue 6), end to end.
 *
 * WHY THESE TESTS COMMIT (UNLIKE EVERY OTHER FILE IN THIS SUITE)
 * -------------------------------------------------------------
 * The other integration files hand a test-owned transaction client to the
 * repository under test and roll it back. That cannot work here: these tests
 * exercise SERVICE functions, and each service function opens its OWN
 * connection from the pool. A service's transaction cannot see fixture rows
 * sitting uncommitted in a different transaction, so the fixtures must be
 * committed for real.
 *
 * That is the whole point. The property under test is that the audit row and
 * the action it records COMMIT OR ROLL BACK TOGETHER, and a test that never
 * lets anything commit cannot demonstrate it.
 *
 * Cleanup is therefore explicit and unconditional (`afterEach`), and relies on
 * `projects`' ON DELETE CASCADE, which every dependent table uses --
 * activity_log, payments, payment_installments, quotations, notifications,
 * milestones, project_assignments. Deleting the project removes the entire
 * fixture graph.
 */

import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const { probeDatabase } = require('./helpers/db');
const pool = require('../../src/config/database');
const projectsService = require('../../src/services/projects.service');
const paymentsService = require('../../src/services/payments.service');
const { ACTIVITY_ACTIONS } = require('../../src/constants/activityActions');

let available = false;

beforeAll(async () => {
  const probe = await probeDatabase();
  available = probe.ok;
  if (!available) {
    console.warn(`\n[integration] SKIPPING activity audit tests: ${probe.reason}\n`);
  }
});

const dbIt = (name, fn) => it(name, async (ctx) => (available ? fn(ctx) : ctx.skip()));

/** Everything created by a test, torn down unconditionally afterwards. */
const created = { projectIds: [], userIds: [], registrationUuids: [] };

afterEach(async () => {
  if (!available) return;
  // Order matters: projects cascade to their dependents, users cascade from
  // registration. Best-effort per row so one failure cannot strand the rest.
  for (const id of created.projectIds) {
    await pool.query('DELETE FROM projects WHERE id = $1', [id]).catch(() => {});
  }
  for (const id of created.userIds) {
    await pool.query('DELETE FROM users WHERE user_id = $1', [id]).catch(() => {});
  }
  for (const uuid of created.registrationUuids) {
    await pool.query('DELETE FROM registration WHERE registration_uuid = $1', [uuid]).catch(() => {});
  }
  created.projectIds.length = 0;
  created.userIds.length = 0;
  created.registrationUuids.length = 0;
});

let seq = 0;
async function makeUser(role = 'CLIENT') {
  seq += 1;
  const { rows: reg } = await pool.query(
    `INSERT INTO registration (first_name, middle_name, last_name, email)
     VALUES ('Audit','A','Fixture',$1) RETURNING registration_uuid`,
    [`audit-${Date.now()}-${seq}@example.test`]
  );
  created.registrationUuids.push(reg[0].registration_uuid);
  const { rows: user } = await pool.query(
    `INSERT INTO users (registration_uuid, password_hash, role) VALUES ($1,'x',$2) RETURNING user_id`,
    [reg[0].registration_uuid, role]
  );
  created.userIds.push(user[0].user_id);
  return user[0].user_id;
}

async function makeProject(clientId, statusCode = 'submitted') {
  seq += 1;
  const { rows } = await pool.query(
    `INSERT INTO projects (client_id, title, status_code, reference_code)
     VALUES ($1, 'Audit Fixture Project', $2, $3) RETURNING *`,
    [clientId, statusCode, `CH-2099-A${String(seq).padStart(3, '0')}`]
  );
  created.projectIds.push(rows[0].id);
  return rows[0];
}

async function makeSchedule(projectId, { amount = '50000.00', status = 'pending', sequence = 1 } = {}) {
  const { rows: q } = await pool.query(
    `INSERT INTO quotations (project_id, base_price, total_amount, status)
     VALUES ($1, $2, $2, 'accepted') RETURNING *`,
    [projectId, '100000.00']
  );
  const { rows: inst } = await pool.query(
    `INSERT INTO payment_installments (project_id, quotation_id, sequence, percentage, amount, due_date, status)
     VALUES ($1,$2,$3,'50.00',$4, CURRENT_DATE, $5) RETURNING *`,
    [projectId, q[0].id, sequence, amount, status]
  );
  return { quotation: q[0], installment: inst[0] };
}

async function auditRows(projectId) {
  const { rows } = await pool.query(
    'SELECT * FROM activity_log WHERE project_id = $1 ORDER BY created_at ASC',
    [projectId]
  );
  return rows;
}

describe('payment verification is audited', () => {
  dbIt('writes an attributed payment_verified row inside the same transaction', async () => {
    const clientId = await makeUser();
    const adminId = await makeUser('ADMIN');
    const project = await makeProject(clientId, 'payment_pending');
    const { installment } = await makeSchedule(project.id);

    const { rows: pay } = await pool.query(
      `INSERT INTO payments (project_id, payment_method, amount, reference_number, status, installment_id, shortfall_amount)
       VALUES ($1,'bank_transfer','48000.00','REF-AUDIT-1','verification',$2,'2000.00') RETURNING *`,
      [project.id, installment.id]
    );

    await paymentsService.verifyPayment(pay[0].id, adminId);

    const log = await auditRows(project.id);
    const entry = log.find((r) => r.action_type === ACTIVITY_ACTIONS.PAYMENT_VERIFIED);

    expect(entry, 'no payment_verified audit row was written').toBeDefined();
    // Attribution is the entire purpose of the control.
    expect(String(entry.actor_user_id)).toBe(String(adminId));
    expect(entry.summary).toContain('verified payment');
    // The withholding-tax shortfall is the accountant's reconciliation hook.
    expect(entry.summary).toContain('shortfall');
    expect(entry.metadata.paymentId).toBe(pay[0].id);
    expect(entry.metadata.shortfallAmount).toBe('2000.00');
    expect(entry.metadata.installmentSequence).toBe(1);
    expect(entry.created_at).toBeInstanceOf(Date);
  });

  dbIt('writes NO audit row when the verification is refused', async () => {
    // THE ATOMICITY TEST. An already-verified payment throws 409 -- and must
    // leave no orphaned "money was accepted" entry behind it.
    const clientId = await makeUser();
    const adminId = await makeUser('ADMIN');
    const project = await makeProject(clientId, 'accepted');
    const { installment } = await makeSchedule(project.id, { status: 'paid' });

    const { rows: pay } = await pool.query(
      `INSERT INTO payments (project_id, payment_method, amount, status, installment_id)
       VALUES ($1,'gcash','50000.00','verified',$2) RETURNING *`,
      [project.id, installment.id]
    );

    await expect(paymentsService.verifyPayment(pay[0].id, adminId)).rejects.toMatchObject({ statusCode: 409 });

    expect(await auditRows(project.id)).toHaveLength(0);
  });
});

describe('payment rejection is audited', () => {
  dbIt('records the rejection reason in an append-only entry', async () => {
    const clientId = await makeUser();
    const adminId = await makeUser('ADMIN');
    const project = await makeProject(clientId, 'payment_verification');
    const { installment } = await makeSchedule(project.id);

    const { rows: pay } = await pool.query(
      `INSERT INTO payments (project_id, payment_method, amount, status, installment_id)
       VALUES ($1,'gcash','50000.00','verification',$2) RETURNING *`,
      [project.id, installment.id]
    );

    const reason = 'Proof of payment screenshot is unreadable';
    await paymentsService.rejectPayment(pay[0].id, adminId, reason);

    const entry = (await auditRows(project.id)).find(
      (r) => r.action_type === ACTIVITY_ACTIONS.PAYMENT_REJECTED
    );

    expect(entry).toBeDefined();
    expect(String(entry.actor_user_id)).toBe(String(adminId));
    expect(entry.summary).toContain(reason);
    expect(entry.metadata.reason).toBe(reason);

    // And the rejection itself landed -- proving the transaction committed as a
    // unit rather than the log alone.
    const { rows } = await pool.query('SELECT status, rejection_reason FROM payments WHERE id = $1', [pay[0].id]);
    expect(rows[0].status).toBe('rejected');
    expect(rows[0].rejection_reason).toBe(reason);
  });

  dbIt('writes NO audit row when the rejection is refused', async () => {
    const clientId = await makeUser();
    const adminId = await makeUser('ADMIN');
    const project = await makeProject(clientId, 'accepted');
    const { installment } = await makeSchedule(project.id, { status: 'paid' });

    const { rows: pay } = await pool.query(
      `INSERT INTO payments (project_id, payment_method, amount, status, installment_id)
       VALUES ($1,'gcash','50000.00','verified',$2) RETURNING *`,
      [project.id, installment.id]
    );

    await expect(paymentsService.rejectPayment(pay[0].id, adminId, 'nope')).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(await auditRows(project.id)).toHaveLength(0);
  });
});

describe('project accept / decline / deliver are audited', () => {
  dbIt('acceptProjectAdmin logs an attributed project_accepted entry', async () => {
    const clientId = await makeUser();
    const adminId = await makeUser('ADMIN');
    const project = await makeProject(clientId, 'submitted');

    await projectsService.acceptProjectAdmin(project.id, adminId);

    const entry = (await auditRows(project.id)).find(
      (r) => r.action_type === ACTIVITY_ACTIONS.PROJECT_ACCEPTED
    );
    expect(entry).toBeDefined();
    expect(String(entry.actor_user_id)).toBe(String(adminId));
    expect(entry.metadata.from).toBe('submitted');
    expect(entry.metadata.to).toBe('under_review');
  });

  dbIt('declineProjectAdmin captures the reason immutably', async () => {
    const clientId = await makeUser();
    const adminId = await makeUser('ADMIN');
    const project = await makeProject(clientId, 'submitted');

    const reason = 'Out of scope for our current capacity';
    await projectsService.declineProjectAdmin(project.id, reason, adminId);

    const entry = (await auditRows(project.id)).find(
      (r) => r.action_type === ACTIVITY_ACTIONS.PROJECT_DECLINED
    );
    expect(entry).toBeDefined();
    expect(entry.metadata.reason).toBe(reason);
    expect(entry.summary).toContain(reason);

    // projects.decline_reason is MUTABLE state; the audit copy is not. Overwrite
    // the project's copy and confirm the trail still holds the original -- this
    // is precisely why the reason is mirrored rather than joined at read time.
    await pool.query('UPDATE projects SET decline_reason = $1 WHERE id = $2', ['something else', project.id]);
    const after = (await auditRows(project.id)).find(
      (r) => r.action_type === ACTIVITY_ACTIONS.PROJECT_DECLINED
    );
    expect(after.metadata.reason).toBe(reason);
  });

  dbIt('refuses to accept a non-submitted project and logs nothing', async () => {
    const clientId = await makeUser();
    const adminId = await makeUser('ADMIN');
    const project = await makeProject(clientId, 'in_development');

    await expect(projectsService.acceptProjectAdmin(project.id, adminId)).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(await auditRows(project.id)).toHaveLength(0);
  });

  dbIt('markProjectDeliveredAdmin logs the payment evidence it decided on', async () => {
    const clientId = await makeUser();
    const adminId = await makeUser('ADMIN');
    const project = await makeProject(clientId, 'deployed');
    await makeSchedule(project.id, { status: 'paid' });

    await projectsService.markProjectDeliveredAdmin(project.id, adminId);

    const entry = (await auditRows(project.id)).find(
      (r) => r.action_type === ACTIVITY_ACTIONS.PROJECT_DELIVERED
    );
    expect(entry).toBeDefined();
    expect(String(entry.actor_user_id)).toBe(String(adminId));
    expect(entry.metadata.installmentCount).toBe(1);

    const { rows } = await pool.query('SELECT status_code FROM projects WHERE id = $1', [project.id]);
    expect(rows[0].status_code).toBe('delivered');
  });

  dbIt('writes NO audit row when delivery is blocked by an unpaid installment', async () => {
    const clientId = await makeUser();
    const adminId = await makeUser('ADMIN');
    const project = await makeProject(clientId, 'deployed');
    await makeSchedule(project.id, { status: 'pending' });

    await expect(projectsService.markProjectDeliveredAdmin(project.id, adminId)).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(await auditRows(project.id)).toHaveLength(0);

    const { rows } = await pool.query('SELECT status_code FROM projects WHERE id = $1', [project.id]);
    expect(rows[0].status_code).toBe('deployed');
  });
});

describe('the transition graph is enforced against a real database', () => {
  // Issue 4's guard, exercised end to end rather than against the pure map --
  // this is the path that actually reaches `project_statuses` and the project
  // row, which the DB-less unit tests structurally cannot cover.
  dbIt('refuses submitted -> completed with 409', async () => {
    const clientId = await makeUser();
    const project = await makeProject(clientId, 'submitted');

    await expect(
      projectsService.updateProjectStatusAdmin(project.id, 'completed', 'ADMIN')
    ).rejects.toMatchObject({ statusCode: 409 });

    const { rows } = await pool.query('SELECT status_code FROM projects WHERE id = $1', [project.id]);
    expect(rows[0].status_code).toBe('submitted');
  });

  dbIt('refuses delivered -> draft with 409', async () => {
    const clientId = await makeUser();
    const project = await makeProject(clientId, 'delivered');

    await expect(
      projectsService.updateProjectStatusAdmin(project.id, 'draft', 'ADMIN')
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  dbIt('refuses to move a project out of a terminal status', async () => {
    const clientId = await makeUser();
    const project = await makeProject(clientId, 'completed');

    await expect(
      projectsService.updateProjectStatusAdmin(project.id, 'in_development', 'ADMIN')
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  dbIt('permits a legal step, persists it, and logs who made it', async () => {
    // Issue 3: updateProjectStatusAdmin was the sixth commercial action, added
    // to the audit trail after issue 6 shipped without it. This is the one
    // assertion the DB-less unit suite structurally cannot make -- it needs a
    // real activity_log row, written through the real 030 CHECK constraint.
    const clientId = await makeUser();
    const adminId = await makeUser('ADMIN');
    const project = await makeProject(clientId, 'submitted');

    const updated = await projectsService.updateProjectStatusAdmin(
      project.id,
      'under_review',
      'ADMIN',
      adminId
    );
    expect(updated.status_code).toBe('under_review');

    const rows = await auditRows(project.id);
    const entry = rows.find((r) => r.action_type === ACTIVITY_ACTIONS.PROJECT_STATUS_CHANGED);
    expect(entry, 'expected a project_status_changed audit row').toBeTruthy();
    expect(entry.actor_user_id).toBe(adminId);
    expect(entry.metadata).toMatchObject({ from: 'submitted', to: 'under_review' });
  });

  dbIt('does not log a no-op re-save of the current status', async () => {
    // Mirrors the existing notification guard: re-applying the status a
    // project already has is not a transition, so it must not appear in the
    // trail as one -- a from/to pair that are identical is not what "changed"
    // means, and would be a false event in a segregation-of-duties log.
    const clientId = await makeUser();
    const adminId = await makeUser('ADMIN');
    const project = await makeProject(clientId, 'submitted');

    await projectsService.updateProjectStatusAdmin(project.id, 'submitted', 'ADMIN', adminId);

    const rows = await auditRows(project.id);
    expect(rows.find((r) => r.action_type === ACTIVITY_ACTIONS.PROJECT_STATUS_CHANGED)).toBeUndefined();
  });

  dbIt('still rejects a status code that does not exist at all, with 400', async () => {
    const clientId = await makeUser();
    const project = await makeProject(clientId, 'submitted');

    await expect(
      projectsService.updateProjectStatusAdmin(project.id, 'not_a_real_status', 'ADMIN')
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
