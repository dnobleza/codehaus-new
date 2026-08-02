const pool = require('../config/database');

// Raw, parameterized `pg` queries only -- no business logic (see
// services/payments.service.js for verification/transition rules).

async function insert(data, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO payments (project_id, payment_method, amount, reference_number, proof_of_payment_url, status, installment_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [
      data.projectId,
      data.paymentMethod,
      data.amount,
      data.referenceNumber ?? null,
      data.proofOfPaymentUrl ?? null,
      data.status ?? 'pending',
      data.installmentId ?? null,
    ]
  );
  return rows[0];
}

async function findById(id, db = pool) {
  const { rows } = await db.query('SELECT * FROM payments WHERE id = $1', [id]);
  return rows[0] || null;
}

async function findByIdForProject(id, projectId, db = pool) {
  const { rows } = await db.query('SELECT * FROM payments WHERE id = $1 AND project_id = $2', [id, projectId]);
  return rows[0] || null;
}

async function listByProject(projectId, db = pool) {
  const { rows } = await db.query('SELECT * FROM payments WHERE project_id = $1 ORDER BY created_at DESC', [
    projectId,
  ]);
  return rows;
}

/*
  The verification queue's rows carry the project and client they belong to.

  Without this the queue could only show a payment's own columns, so an admin
  saw a bare `project_id` UUID and an amount and had to approve money without
  knowing whose it was or which installment it settled. `installment_sequence`
  comes along for the same reason -- "installment 2 of 5" is what makes an
  expected amount checkable against a bank slip.

  All joins are LEFT: `installment_id` is nullable (payments predating
  019_add_payment_installment_id.sql), and a payment must never disappear from
  the verification queue because a joined row is missing.
*/
const PAYMENT_WITH_CONTEXT_SELECT = `
  SELECT p.*,
         pr.title          AS project_title,
         pr.reference_code AS project_reference_code,
         r.first_name      AS client_first_name,
         r.last_name       AS client_last_name,
         pi.sequence       AS installment_sequence
  FROM payments p
  LEFT JOIN projects pr ON pr.id = p.project_id
  LEFT JOIN users u ON u.user_id = pr.client_id
  LEFT JOIN registration r ON r.registration_uuid = u.registration_uuid
  LEFT JOIN payment_installments pi ON pi.id = p.installment_id`;

async function listAll({ status } = {}, db = pool) {
  const values = [];
  let where = '1=1';
  if (status) {
    values.push(status);
    where += ` AND p.status = $${values.length}`;
  }
  const { rows } = await db.query(
    `${PAYMENT_WITH_CONTEXT_SELECT} WHERE ${where} ORDER BY p.created_at DESC`,
    values
  );
  return rows;
}

// Same shape and filter support as `listAll`, narrowed to payments on projects
// the given user is formally assigned to (project_assignments). Backs the
// staff view of the payments queue: staff owns delivery execution, so they can
// see whether their own projects are paid up, but never every client's money.
//
// The join predicate does the scoping, so an unassigned project's payments are
// unreachable rather than filtered out after the fact.
async function listAssignedTo(userId, { status } = {}, db = pool) {
  const values = [userId];
  let where = 'pa.user_id = $1';
  if (status) {
    values.push(status);
    where += ` AND p.status = $${values.length}`;
  }
  const { rows } = await db.query(
    `${PAYMENT_WITH_CONTEXT_SELECT}
     JOIN project_assignments pa ON pa.project_id = p.project_id
     WHERE ${where}
     ORDER BY p.created_at DESC`,
    values
  );
  return rows;
}

async function setStatus(id, { status, verifiedBy, verifiedAt }, db = pool) {
  const { rows } = await db.query(
    `UPDATE payments SET status = $1, verified_by = $2, verified_at = $3 WHERE id = $4 RETURNING *`,
    [status, verifiedBy ?? null, verifiedAt ?? null, id]
  );
  return rows[0] || null;
}

// Every payment across the caller's own projects, newest first, joined to the
// context the client Invoices page needs: the project's title and the sequence
// of the installment the payment settled. Ownership is enforced by the join
// predicate (pr.client_id = $1), not by filtering after the fact.
//
// The installment join is a LEFT JOIN on purpose: `payments.installment_id` is
// nullable, so a payment that predates the installment schedule still appears
// in the list (with a null sequence) rather than vanishing from the client's
// own payment history.
//
// Deliberately does NOT go through `paymentPresenter` — this list omits
// `proof_of_payment_url` entirely rather than presenting it, since the
// Invoices page never renders proof images and the column carries financial
// PII (see paymentPresenter.js's comment).
async function listByClientWithContext(clientId, db = pool) {
  const { rows } = await db.query(
    `SELECT p.id,
            p.project_id,
            pr.title AS project_title,
            p.payment_method,
            p.amount,
            p.reference_number,
            p.status,
            p.created_at,
            p.verified_at,
            pi.sequence AS installment_sequence
     FROM payments p
     JOIN projects pr ON pr.id = p.project_id
     LEFT JOIN payment_installments pi ON pi.id = p.installment_id
     WHERE pr.client_id = $1
     ORDER BY p.created_at DESC`,
    [clientId]
  );
  return rows;
}

module.exports = {
  insert,
  findById,
  findByIdForProject,
  listByProject,
  listByClientWithContext,
  listAll,
  listAssignedTo,
  setStatus,
};
