/**
 * The financial/commercial audit trail (issue 6).
 *
 * Payment verification was made admin-only for segregation of duties
 * (routes/adminPayments.route.js). That control is worth little without an
 * immutable record of who verified what, so verify/reject/accept/decline/deliver
 * now each write an `activity_log` row inside their own transaction.
 *
 * This file covers the parts that need no database: the action-type constants
 * agreeing with the migration's CHECK constraint, and the service functions
 * still being wired to accept an actor. The parts that genuinely require SQL --
 * that the row is really written, and that it really rolls back with a failed
 * action -- are in tests/integration/activityAudit.integration.test.js.
 */

process.env.JWT_SECRET = 'test-secret-for-activity-audit-suite';
process.env.DB_HOST = '127.0.0.1';
process.env.DB_PORT = '1';
process.env.DB_USER = 'test';
process.env.DB_PASSWORD = 'test';
process.env.DB_NAME = 'test';

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
const { ACTIVITY_ACTIONS, FINANCIAL_ACTIONS } = require('../src/constants/activityActions');

const MIGRATION_029 = readFileSync(
  path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\//, '')), '..', 'db', 'migrations', '029_add_activity_log_commercial_action_types.sql'),
  'utf8'
);

describe('activity action constants', () => {
  it('names exactly the five financial/commercial actions issue 6 scopes', () => {
    expect([...FINANCIAL_ACTIONS].sort()).toEqual([
      'payment_rejected',
      'payment_verified',
      'project_accepted',
      'project_declined',
      'project_delivered',
    ]);
  });

  it('preserves the five delivery actions 022 already defined', () => {
    // Widening the CHECK constraint must never DROP a value -- an existing row
    // holding a delivery action would become unrepresentable and 029's guard
    // block would (correctly) refuse to run.
    for (const code of ['file_uploaded', 'task_completed', 'progress_updated', 'milestone_completed', 'commented']) {
      expect(Object.values(ACTIVITY_ACTIONS)).toContain(code);
    }
  });

  it('every constant appears in migration 029\'s CHECK constraint', () => {
    // The DB constraint is the real authority; a constant that is not in it
    // would fail at INSERT time with an opaque 23514 -- and because these
    // writes sit inside the transaction of the action they audit, that would
    // roll back a legitimate payment verification.
    for (const value of Object.values(ACTIVITY_ACTIONS)) {
      expect(MIGRATION_029, `"${value}" missing from 029's CHECK constraint`).toContain(`'${value}'`);
    }
  });

  it('is frozen so an action type cannot be mutated at runtime', () => {
    expect(Object.isFrozen(ACTIVITY_ACTIONS)).toBe(true);
    expect(Object.isFrozen(FINANCIAL_ACTIONS)).toBe(true);
  });
});

describe('audited service functions accept an actor', () => {
  // Attribution is the entire point of the trail: a log entry that cannot say
  // WHO acted does not deliver segregation of duties. These assert the actor
  // parameter still exists in each signature, so a refactor that drops it is
  // caught here rather than silently producing NULL-actor audit rows.
  const EXPECTED_ARITY = {
    acceptProjectAdmin: 2, // (id, actorUserId)
    declineProjectAdmin: 3, // (id, reason, actorUserId)
    markProjectDeliveredAdmin: 2, // (id, actorUserId)
  };

  it('projects.service exposes the audited functions with an actor parameter', async () => {
    const projectsService = require('../src/services/projects.service');
    for (const [name, arity] of Object.entries(EXPECTED_ARITY)) {
      expect(typeof projectsService[name], `${name} missing`).toBe('function');
      expect(projectsService[name].length, `${name} lost its actor parameter`).toBe(arity);
    }
  });

  it('payments.service keeps the actor parameter on verify and reject', async () => {
    const paymentsService = require('../src/services/payments.service');
    // verifyPayment(paymentId, verifiedByUserId)
    expect(paymentsService.verifyPayment.length).toBe(2);
    // rejectPayment(paymentId, verifiedByUserId, reason)
    expect(paymentsService.rejectPayment.length).toBe(3);
  });
});

describe('audited actions are transactional', () => {
  // Every audited action must open its own transaction, because the log row and
  // the action it records have to commit or roll back together. Before this
  // pass, rejectPayment / acceptProjectAdmin / declineProjectAdmin /
  // markProjectDeliveredAdmin were all non-transactional single writes.
  //
  // Asserted structurally (the service source contains BEGIN/COMMIT/ROLLBACK
  // within each function) because proving it behaviourally needs a real
  // database -- which the integration suite then does.
  function functionBody(source, name) {
    const start = source.indexOf(`async function ${name}(`);
    expect(start, `${name} not found in source`).toBeGreaterThan(-1);
    // Up to the next top-level `async function`, which is enough to isolate it.
    const next = source.indexOf('\nasync function ', start + 1);
    return source.slice(start, next === -1 ? source.length : next);
  }

  const projectsSource = readFileSync(
    path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\//, '')), '..', 'src', 'services', 'projects.service.js'),
    'utf8'
  );
  const paymentsSource = readFileSync(
    path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\//, '')), '..', 'src', 'services', 'payments.service.js'),
    'utf8'
  );

  const CASES = [
    ['projects.service', 'acceptProjectAdmin'],
    ['projects.service', 'declineProjectAdmin'],
    ['projects.service', 'markProjectDeliveredAdmin'],
    ['payments.service', 'verifyPayment'],
    ['payments.service', 'rejectPayment'],
  ];

  for (const [file, name] of CASES) {
    it(`${file}#${name} opens a transaction and writes its audit row inside it`, () => {
      const source = file === 'projects.service' ? projectsSource : paymentsSource;
      const body = functionBody(source, name);

      expect(body, `${name} must BEGIN`).toContain("client.query('BEGIN')");
      expect(body, `${name} must COMMIT`).toContain("client.query('COMMIT')");
      expect(body, `${name} must ROLLBACK on error`).toContain("client.query('ROLLBACK')");
      expect(body, `${name} must write an audit row`).toContain('activityRepo.create');

      // The audit write must be handed the transaction client, not the pool --
      // otherwise it would commit independently and survive a rolled-back action.
      const createIndex = body.indexOf('activityRepo.create');
      const commitIndex = body.indexOf("client.query('COMMIT')");
      expect(createIndex, `${name} must log before COMMIT`).toBeLessThan(commitIndex);
    });
  }

  it('does not log actions outside issue 6\'s scope', () => {
    // Reads, lists and milestone updates are deliberately excluded -- milestone
    // progress is already logged by projectOverview.service.js, and logging
    // reads would drown the commercial signal in noise.
    for (const name of ['listProjectsAdmin', 'getProjectAdmin', 'listProjectAssignments']) {
      expect(functionBody(projectsSource, name)).not.toContain('activityRepo.create');
    }
  });
});
