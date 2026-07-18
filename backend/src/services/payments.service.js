const pool = require('../config/database');
const paymentsRepo = require('../repositories/payments.repository');
const projectsRepo = require('../repositories/projects.repository');
const paymentInstallmentsRepo = require('../repositories/paymentInstallments.repository');
const { resolvePaymentProofPath } = require('../middleware/upload.middleware');
const logger = require('../utils/logger');
const TAG = '[PAYMENTS-SERVICE]';

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
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

    const updated = await paymentsRepo.setStatus(
      paymentId,
      { status: 'verified', verifiedBy: verifiedByUserId, verifiedAt: new Date() },
      client
    );

    const installment = await paymentInstallmentsRepo.setPaid(payment.installment_id, client);

    if (installment.sequence === 1) {
      await projectsRepo.updateStatus(payment.project_id, 'accepted', client);
    }

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
  logger.info(`${TAG} Payment ${paymentId} rejected by user ${verifiedByUserId}`);
  return updated;
}

// Authorization for GET /projects/:id/payments/:paymentId/proof: the
// requesting user must be the client who owns the project, or role
// ADMIN/STAFF. Every failure path (project doesn't exist, payment doesn't
// exist, payment belongs to a different project, requester is neither the
// owner nor elevated) throws the SAME 404 -- never a 403 -- so a caller who
// isn't authorized can't distinguish "this doesn't exist" from "this exists
// but isn't yours", which would otherwise leak which project/payment ids
// are real to someone probing the endpoint.
async function resolveProofForAccess({ projectId, paymentId, requestingUser }) {
  const project = await projectsRepo.findById(projectId);
  if (!project) throw httpError(404, 'Payment not found');

  const payment = await paymentsRepo.findByIdForProject(paymentId, projectId);
  if (!payment || !payment.proof_of_payment_url) throw httpError(404, 'Payment not found');

  const role = String(requestingUser?.role || '').toUpperCase();
  const isElevated = role === 'ADMIN' || role === 'STAFF';
  const isOwner = String(project.client_id) === String(requestingUser?.id);

  if (!isElevated && !isOwner) throw httpError(404, 'Payment not found');

  return {
    absolutePath: resolvePaymentProofPath(payment.proof_of_payment_url),
    payment,
  };
}

module.exports = {
  createPayment,
  listPaymentsForClientProject,
  listPaymentsAdmin,
  verifyPayment,
  rejectPayment,
  resolveProofForAccess,
};
