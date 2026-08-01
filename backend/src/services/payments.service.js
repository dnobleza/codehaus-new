const pool = require('../config/database');
const paymentsRepo = require('../repositories/payments.repository');
const projectsRepo = require('../repositories/projects.repository');
const paymentInstallmentsRepo = require('../repositories/paymentInstallments.repository');
const notificationsService = require('./notifications.service');
const { resolvePaymentProofPath } = require('../middleware/upload.middleware');
const { ROLES } = require('../constants/roles');
const logger = require('../utils/logger');
const TAG = '[PAYMENTS-SERVICE]';

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

// Notifies the client who owns a project. Takes the caller's `db` (an open
// transaction client, or the pool) so the notification commits atomically with
// the event that caused it -- a client must never be told their payment was
// verified by a transaction that then rolled back.
//
// `notify` itself never throws (see notifications.service.js), so a failure
// here cannot roll back the payment action it accompanies.
async function notifyProjectClient(db, projectId, eventType, context = {}) {
  const { rows } = await db.query('SELECT client_id, title FROM projects WHERE id = $1', [projectId]);
  const project = rows[0];
  if (!project) return;

  await notificationsService.notify(
    {
      userId: project.client_id,
      eventType,
      projectId,
      context: { projectTitle: project.title, ...context },
    },
    db
  );
}

// A client submits a payment against whichever installment is next in
// their project's payment_installments schedule (see
// docs/superpowers/specs/2026-07-18-payment-installment-plan-design.md) --
// the client never chooses/names an installment; the server resolves it.
// The submitted amount must match that installment's amount exactly (never
// trust a client-supplied amount against the schedule). Combines Client
// Workflow steps 9 ("select payment method") and 10 ("upload proof of
// payment") into a single write, same as before -- the payment is created
// directly in 'verification' status (proof already attached).
async function createPayment({ projectId, clientId, paymentMethod, amount, referenceNumber, proofOfPaymentUrl }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: projectRows } = await client.query(
      'SELECT * FROM projects WHERE id = $1 AND client_id = $2 FOR UPDATE',
      [projectId, clientId]
    );
    const project = projectRows[0];
    if (!project) throw httpError(404, 'Project not found');

    const installment = await paymentInstallmentsRepo.findNextPending(projectId, client);
    if (!installment) {
      throw httpError(409, 'This project is not currently awaiting a payment submission');
    }
    if (Number(amount) !== Number(installment.amount)) {
      throw httpError(
        409,
        `Amount must match installment ${installment.sequence}'s due amount of ${installment.amount}`
      );
    }

    const payment = await paymentsRepo.insert(
      {
        projectId,
        paymentMethod,
        amount,
        referenceNumber,
        proofOfPaymentUrl,
        status: 'verification',
        installmentId: installment.id,
      },
      client
    );

    await client.query('COMMIT');
    logger.info(
      `${TAG} Client ${clientId} submitted payment ${payment.id} for project ${projectId} (installment ${installment.sequence})`
    );
    return payment;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function listPaymentsForClientProject(projectId, clientId) {
  const project = await projectsRepo.findByIdForClient(projectId, clientId);
  if (!project) throw httpError(404, 'Project not found');
  return paymentsRepo.listByProject(projectId);
}

async function listPaymentsAdmin(filters) {
  return paymentsRepo.listAll(filters);
}

// Verifying a payment marks its linked installment 'paid'. Only verifying
// the DOWNPAYMENT (sequence 1) also transitions the parent project to
// 'accepted' in the SAME transaction (Client Workflow steps 11 -> 12),
// matching the original single-payment behavior. Installments 2-5 verify
// without touching projects.status_code -- the project is already in
// progress by then, and unconditionally overwriting status_code would
// clobber real build-progress tracking (e.g. 'in_development').
async function verifyPayment(paymentId, verifiedByUserId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: paymentRows } = await client.query('SELECT * FROM payments WHERE id = $1 FOR UPDATE', [paymentId]);
    const payment = paymentRows[0];
    if (!payment) throw httpError(404, 'Payment not found');
    if (payment.status === 'verified') throw httpError(409, 'Payment has already been verified');
    if (!payment.installment_id) {
      // Predates 019_add_payment_installment_id.sql -- a payment submitted
      // under the old single-lump-sum flow, before every payment was
      // required to link to an installment. Nothing to mark paid against.
      throw httpError(409, 'This payment is not linked to an installment and cannot be verified');
    }

    const updated = await paymentsRepo.setStatus(
      paymentId,
      { status: 'verified', verifiedBy: verifiedByUserId, verifiedAt: new Date() },
      client
    );

    const installment = await paymentInstallmentsRepo.setPaid(payment.installment_id, client);

    if (installment.sequence === 1) {
      await projectsRepo.updateStatus(payment.project_id, 'accepted', client);
    }

    await notifyProjectClient(client, payment.project_id, 'payment_verified', {
      amount: payment.amount,
    });

    await client.query('COMMIT');
    logger.info(
      `${TAG} Payment ${paymentId} verified by user ${verifiedByUserId}; installment ${installment.sequence} marked paid`
    );
    return updated;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Rejecting a payment does NOT change the project's status (per the brief:
// "the client needs to resubmit"). No transaction needed -- this is a
// single-statement write, unlike verifyPayment which also has to move the
// project forward.
async function rejectPayment(paymentId, verifiedByUserId) {
  const payment = await paymentsRepo.findById(paymentId);
  if (!payment) throw httpError(404, 'Payment not found');
  if (payment.status === 'verified') throw httpError(409, 'A verified payment cannot be rejected');

  const updated = await paymentsRepo.setStatus(paymentId, {
    status: 'rejected',
    verifiedBy: verifiedByUserId,
    verifiedAt: new Date(),
  });
  await notifyProjectClient(pool, payment.project_id, 'payment_rejected');

  logger.info(`${TAG} Payment ${paymentId} rejected by user ${verifiedByUserId}`);
  return updated;
}

// Authorization for GET /projects/:id/payments/:paymentId/proof: the
// requesting user must be the client who owns the project, or role ADMIN.
// Every failure path (project doesn't exist, payment doesn't exist, payment
// belongs to a different project, requester is neither the owner nor elevated)
// throws the SAME 404 -- never a 403 -- so a caller who isn't authorized can't
// distinguish "this doesn't exist" from "this exists but isn't yours", which
// would otherwise leak which project/payment ids are real to someone probing
// the endpoint.
//
// STAFF is deliberately NOT elevated here. These files are bank transfer slips
// and GCash screenshots: account numbers, account holder names, phone numbers.
// app.js excludes the whole payment-proofs directory from static serving for
// exactly that reason, and granting every staff member blanket read access
// through this route reopened the hole the static-mount exclusion closed.
// Staff owns delivery execution and has no reason to see a client's banking
// details; verification -- the one job that requires looking at a proof -- is
// admin-only (adminPayments.route.js).
async function resolveProofForAccess({ projectId, paymentId, requestingUser }) {
  const project = await projectsRepo.findById(projectId);
  if (!project) throw httpError(404, 'Payment not found');

  const payment = await paymentsRepo.findByIdForProject(paymentId, projectId);
  if (!payment || !payment.proof_of_payment_url) throw httpError(404, 'Payment not found');

  const role = String(requestingUser?.role || '').toUpperCase();
  const isElevated = role === ROLES.ADMIN;
  const isOwner = String(project.client_id) === String(requestingUser?.id);

  if (!isElevated && !isOwner) throw httpError(404, 'Payment not found');

  return {
    absolutePath: resolvePaymentProofPath(payment.proof_of_payment_url),
    payment,
  };
}

// Backs the client's Invoices page: every payment the client has made,
// grouped by the project it belongs to, with per-project totals.
//
// Two queries total, never one-per-project. Grouping happens here rather than
// in SQL because the per-group totals are business rules, not data shape:
//
//   `amount_paid` counts ONLY `verified` payments. A payment sitting in
//   `verification` is money the client has sent but the team hasn't
//   confirmed; counting it would tell the client they have paid more than
//   they demonstrably have. A `rejected` one was never valid at all.
//
//   `balance_due` comes from the installment schedule, not from subtracting
//   payments — the schedule is the source of truth for what is owed.
async function listInvoicesForClient(clientId) {
  const [payments, balances] = await Promise.all([
    paymentsRepo.listByClientWithContext(clientId),
    paymentInstallmentsRepo.outstandingBalanceByClient(clientId),
  ]);

  const balanceByProject = new Map(balances.map((row) => [row.project_id, row.balance_due]));
  const groups = new Map();

  for (const payment of payments) {
    const { project_id: projectId, project_title: projectTitle, ...rest } = payment;

    if (!groups.has(projectId)) {
      groups.set(projectId, {
        project_id: projectId,
        project_title: projectTitle,
        balance_due: balanceByProject.get(projectId) ?? '0',
        amount_paid: 0,
        payments: [],
      });
    }

    const group = groups.get(projectId);
    group.payments.push({ ...rest, project_id: projectId });
    if (payment.status === 'verified') {
      group.amount_paid += Number(payment.amount);
    }
  }

  // `payments` is already ordered newest-first, so insertion order puts the
  // most recently active project first — the one the client most likely wants.
  return Array.from(groups.values()).map((group) => ({
    ...group,
    amount_paid: group.amount_paid.toFixed(2),
    balance_due: String(group.balance_due),
  }));
}

// Backs the client's Payments page: everything the client currently owes, one
// entry per project, each carrying the exact installment a submission would be
// applied to.
//
// Reshapes the flat query row into `{ project, awaitingVerification,
// installment }` so the installment object matches the shape the payment form
// and the rest of the API already use — the page can hand it straight to the
// submit endpoint without reassembling fields.
async function listDuePaymentsForClient(clientId) {
  const rows = await paymentInstallmentsRepo.listNextDueByClient(clientId);

  return rows.map((row) => {
    const {
      project_title_id: projectId,
      project_title: projectTitle,
      awaiting_verification: awaitingVerification,
      ...installment
    } = row;

    return {
      project_id: projectId,
      project_title: projectTitle,
      awaiting_verification: awaitingVerification,
      installment,
    };
  });
}

module.exports = {
  createPayment,
  listPaymentsForClientProject,
  listInvoicesForClient,
  listDuePaymentsForClient,
  listPaymentsAdmin,
  verifyPayment,
  rejectPayment,
  resolveProofForAccess,
};
