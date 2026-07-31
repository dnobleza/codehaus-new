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

async function listAll({ status } = {}, db = pool) {
  const values = [];
  let where = '1=1';
  if (status) {
    values.push(status);
    where += ` AND status = $${values.length}`;
  }
  const { rows } = await db.query(`SELECT * FROM payments WHERE ${where} ORDER BY created_at DESC`, values);
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
  setStatus,
};
