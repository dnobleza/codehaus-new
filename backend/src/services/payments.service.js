const pool = require('../config/database');
const paymentsRepo = require('../repositories/payments.repository');
const projectsRepo = require('../repositories/projects.repository');
const paymentInstallmentsRepo = require('../repositories/paymentInstallments.repository');
const notificationsService = require('./notifications.service');
const { resolvePaymentProofPath } = require('../middleware/upload.middleware');
const { ROLES } = require('../constants/roles');
const { MAX_WITHHOLDING_SHORTFALL_RATE } = require('../constants/payments');
const { classifyInstallmentPayment } = require('../utils/money');
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
// The submitted amount is always checked against THAT installment's amount
// (never trust a client-supplied amount against the schedule), but the check
// is no longer strict equality -- see WITHHOLDING TAX below. Combines Client
// Workflow steps 9 ("select payment method") and 10 ("upload proof of
// payment") into a single write, same as before -- the payment is created
// directly in 'verification' status (proof already attached).
//
// WITHHOLDING TAX (see constants/payments.js and utils/money.js):
// Philippine corporate clients are withholding agents -- they remit creditable
// withholding tax to the BIR themselves and pay the supplier the net, e.g.
// ₱98,000 against a ₱100,000 installment at 2% EWT. Requiring an exact match
// refused those payments outright and made the product unusable for B2B
// clients. A payment that falls SHORT by no more than
// MAX_WITHHOLDING_SHORTFALL_RATE is now accepted, with the gap recorded on the
// payment as `shortfall_amount` (027_add_payment_shortfall_amount.sql).
//
// Three boundaries are held deliberately:
//   - An EXACT amount behaves precisely as it always did (shortfall 0.00).
//   - An OVERPAYMENT is still refused: that is a refund/credit-note problem
//     with different accounting, and is out of scope for this pass.
//   - A shortfall beyond tolerance is still refused, because at that point it
//     is a mistyped amount or a genuine partial payment, not a tax deduction.
// All comparison happens in integer centavos (utils/money.js) -- NUMERIC(12,2)
// arrives from `pg` as a string and must never be compared as a float.
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
    const { outcome, shortfall, dueAmount } = classifyInstallmentPayment(
      amount,
      installment.amount,
      MAX_WITHHOLDING_SHORTFALL_RATE
    );

    if (outcome === 'invalid') {
      throw httpError(400, 'Payment amount is not a valid monetary value');
    }
    if (outcome === 'overpaid') {
      throw httpError(
        409,
        `Amount cannot exceed installment ${installment.sequence}'s due amount of ${dueAmount}`
      );
    }
    if (outcome === 'underpaid') {
      throw httpError(
        409,
        `Amount is short of installment ${installment.sequence}'s due amount of ${dueAmount} by more than the ` +
          `${Math.round(MAX_WITHHOLDING_SHORTFALL_RATE * 100)}% allowed for withholding tax. ` +
          `Pay ${dueAmount}, or the net of ${dueAmount} after withholding tax.`
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
        shortfallAmount: shortfall,
      },
      client
    );

    await client.query('COMMIT');
    logger.info(
      `${TAG} Client ${clientId} submitted payment ${payment.id} for project ${projectId} ` +
        `(installment ${installment.sequence}, ${outcome}${outcome === 'shortfall' ? `, shortfall ${shortfall}` : ''})`
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

// `actorRole`/`actorUserId` scope this the same way projects.service.js's
// listProjectsAdmin does: STAFF only sees payments on projects they're
// formally assigned to (project_assignments), ADMIN keeps seeing everything.
// Route-level gating can't express this one -- there is no :id on the list
// route -- so the role travels to the repository, the only layer that knows
// how to filter by assignment.
async function listPaymentsAdmin(filters, actorRole, actorUserId) {
  const role = actorRole ? String(actorRole).toUpperCase() : null;
  if (role === ROLES.STAFF) {
    return paymentsRepo.listAssignedTo(actorUserId, filters);
  }
  return paymentsRepo.listAll(filters);
}

// Verifying a payment marks its linked installment 'paid'. Only verifying
// the DOWNPAYMENT (sequence 1) also transitions the parent project to
// 'accepted' in the SAME transaction (Client Workflow steps 11 -> 12),
// matching the original single-payment behavior. Installments 2-5 verify
// without touching projects.status_code -- the project is already in
// progress by then, and unconditionally overwriting status_code would
// clobber real build-progress tracking (e.g. 'in_development').
//
// A payment carrying a withholding-tax `shortfall_amount` marks its
// installment 'paid' just like an exact one, deliberately: the shortfall was
// remitted to the BIR by the client, not withheld from the agency, so nothing
// remains owed on that installment. Whether the money actually landed is the
// admin's call at verification time -- they see the shortfall in the queue --
// and refusing it is what `rejectPayment` is for.
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
//
// `reason` is REQUIRED, and is stored on the payment
// (028_add_payment_rejection_reason.sql) so the client is told what to fix
// instead of being sent back to resubmit the same defective proof. This
// mirrors projects.service.js#declineProjectAdmin exactly: the validator
// (adminRejectPaymentSchema) enforces presence and length, the repository
// writes status and reason in one statement, and the reason rides along in the
// notification context so it reaches the client without an extra fetch.
async function rejectPayment(paymentId, verifiedByUserId, reason) {
  const payment = await paymentsRepo.findById(paymentId);
  if (!payment) throw httpError(404, 'Payment not found');
  if (payment.status === 'verified') throw httpError(409, 'A verified payment cannot be rejected');

  const updated = await paymentsRepo.reject(paymentId, {
    verifiedBy: verifiedByUserId,
    verifiedAt: new Date(),
    reason,
  });
  await notifyProjectClient(pool, payment.project_id, 'payment_rejected', { reason });

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
