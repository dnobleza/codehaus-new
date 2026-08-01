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

// The next installment due on each of the client's projects — one row per
// project, the lowest-sequence still-pending installment, which is exactly the
// installment `payments.service.js#createPayment` resolves a submission
// against. `DISTINCT ON (pr.id)` with `ORDER BY pr.id, pi.sequence` is what
// picks that lowest sequence per project.
//
// No quotation-status filter is needed: installments only exist once a
// quotation has been accepted (the schedule is generated inside the accept
// transaction), so their presence already implies it.
//
// `awaiting_verification` flags a project whose previous submission is still
// being checked. The client must not submit again until it clears — the same
// rule the project Invoices tab used to apply client-side, now resolved
// server-side so there is one source of truth.
async function listNextDueByClient(clientId, db = pool) {
  const { rows } = await db.query(
    `SELECT DISTINCT ON (pr.id)
            pr.id    AS project_title_id,
            pr.title AS project_title,
            pi.id,
            pi.project_id,
            pi.quotation_id,
            pi.sequence,
            pi.percentage,
            pi.amount,
            pi.due_date,
            pi.status,
            pi.created_at,
            EXISTS (
              SELECT 1 FROM payments p
              WHERE p.project_id = pr.id AND p.status = 'verification'
            ) AS awaiting_verification
     FROM projects pr
     JOIN payment_installments pi ON pi.project_id = pr.id AND pi.status = 'pending'
     WHERE pr.client_id = $1
     ORDER BY pr.id, pi.sequence ASC`,
    [clientId]
  );
  return rows;
}

// Outstanding balance per project for one client: the sum of every installment
// still `pending`. One grouped query rather than a per-project round trip, so
// the Invoices page stays a fixed two queries regardless of project count.
async function outstandingBalanceByClient(clientId, db = pool) {
  const { rows } = await db.query(
    `SELECT pi.project_id, SUM(pi.amount)::numeric AS balance_due
     FROM payment_installments pi
     JOIN projects pr ON pr.id = pi.project_id
     WHERE pr.client_id = $1 AND pi.status = 'pending'
     GROUP BY pi.project_id`,
    [clientId]
  );
  return rows;
}

module.exports = {
  insert,
  listByProject,
  findNextPending,
  setPaid,
  countPending,
  countForProject,
  outstandingBalanceByClient,
  listNextDueByClient,
};
