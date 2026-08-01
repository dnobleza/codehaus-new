const pool = require('../config/database');

// Raw, parameterized `pg` queries only -- no business logic (see
// services/projects.service.js).

async function create({ clientId, packageId, title, requestDetails, referenceCode }, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO projects (client_id, package_id, title, request_details, reference_code)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [clientId, packageId ?? null, title, requestDetails ?? null, referenceCode ?? null]
  );
  return rows[0];
}

async function findById(id, db = pool) {
  const { rows } = await db.query('SELECT * FROM projects WHERE id = $1', [id]);
  return rows[0] || null;
}

async function findByIdForClient(id, clientId, db = pool) {
  const { rows } = await db.query('SELECT * FROM projects WHERE id = $1 AND client_id = $2', [id, clientId]);
  return rows[0] || null;
}

async function listByClient(clientId, { statusCode } = {}, db = pool) {
  const values = [clientId];
  let where = 'client_id = $1';
  if (statusCode) {
    values.push(statusCode);
    where += ` AND status_code = $${values.length}`;
  }
  const { rows } = await db.query(`SELECT * FROM projects WHERE ${where} ORDER BY created_at DESC`, values);
  return rows;
}

async function listAll({ statusCode } = {}, db = pool) {
  const values = [];
  let where = '1=1';
  if (statusCode) {
    values.push(statusCode);
    where += ` AND status_code = $${values.length}`;
  }
  const { rows } = await db.query(`SELECT * FROM projects WHERE ${where} ORDER BY created_at DESC`, values);
  return rows;
}

// Staff-scoped counterpart to listAll: same filter support and ordering,
// restricted to projects the caller is formally named on via
// project_assignments (see 010_create_project_assignments.sql --
// idx_project_assignments_user_id exists for exactly this predicate).
// Used by projects.service.js#listProjectsAdmin when the caller is STAFF;
// ADMIN keeps seeing everything via listAll.
async function listAssignedTo(userId, { statusCode } = {}, db = pool) {
  const values = [userId];
  let where = 'pa.user_id = $1';
  if (statusCode) {
    values.push(statusCode);
    where += ` AND p.status_code = $${values.length}`;
  }
  const { rows } = await db.query(
    `SELECT p.* FROM projects p
     JOIN project_assignments pa ON pa.project_id = p.id
     WHERE ${where}
     ORDER BY p.created_at DESC`,
    values
  );
  return rows;
}

async function updateStatus(id, statusCode, db = pool) {
  const { rows } = await db.query('UPDATE projects SET status_code = $1 WHERE id = $2 RETURNING *', [
    statusCode,
    id,
  ]);
  return rows[0] || null;
}

// Declining a project is a single atomic transition: move to the terminal
// 'cancelled' status AND capture the reason, in one UPDATE.
async function decline(id, reason, db = pool) {
  const { rows } = await db.query(
    `UPDATE projects SET status_code = 'cancelled', decline_reason = $1 WHERE id = $2 RETURNING *`,
    [reason, id]
  );
  return rows[0] || null;
}

module.exports = {
  create,
  findById,
  findByIdForClient,
  listByClient,
  listAll,
  listAssignedTo,
  updateStatus,
  decline,
};
