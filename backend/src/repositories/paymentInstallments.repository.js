const pool = require('../config/database');

// Raw, parameterized `pg` queries only -- no business logic (see
// services/quotations.service.js for schedule generation and
// services/payments.service.js for fulfillment/verification rules).

async function insert(data, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO payment_installments (project_id, quotation_id, sequence, percentage, amount, due_date)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [data.projectId, data.quotationId, data.sequence, data.percentage, data.amount, data.dueDate]
  );
  return rows[0];
}

async function listByProject(projectId, db = pool) {
  const { rows } = await db.query(
    'SELECT * FROM payment_installments WHERE project_id = $1 ORDER BY sequence ASC',
    [projectId]
  );
  return rows;
}

// Row-locked so two concurrent payment submissions for the same project
// can never both claim the same installment as "next" -- must be called
// inside an existing BEGIN/COMMIT transaction (see payments.service.js).
async function findNextPending(projectId, db = pool) {
  const { rows } = await db.query(
    `SELECT * FROM payment_installments
     WHERE project_id = $1 AND status = 'pending'
     ORDER BY sequence ASC
     LIMIT 1
     FOR UPDATE`,
    [projectId]
  );
  return rows[0] || null;
}

async function setPaid(id, db = pool) {
  const { rows } = await db.query(`UPDATE payment_installments SET status = 'paid' WHERE id = $1 RETURNING *`, [id]);
  return rows[0] || null;
}

async function countPending(projectId, db = pool) {
  const { rows } = await db.query(
    `SELECT COUNT(*)::int AS count FROM payment_installments WHERE project_id = $1 AND status = 'pending'`,
    [projectId]
  );
  return rows[0].count;
}

async function countForProject(projectId, db = pool) {
  const { rows } = await db.query(`SELECT COUNT(*)::int AS count FROM payment_installments WHERE project_id = $1`, [
    projectId,
  ]);
  return rows[0].count;
}

module.exports = { insert, listByProject, findNextPending, setPaid, countPending, countForProject };
