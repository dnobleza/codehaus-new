const pool = require('../config/database');

// Raw, parameterized `pg` queries only -- no business logic (see
// services/payments.service.js for verification/transition rules).

async function insert(data, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO payments (project_id, payment_method, amount, reference_number, proof_of_payment_url, status)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [
      data.projectId,
      data.paymentMethod,
      data.amount,
      data.referenceNumber ?? null,
      data.proofOfPaymentUrl ?? null,
      data.status ?? 'pending',
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

module.exports = { insert, findById, findByIdForProject, listByProject, listAll, setStatus };
