const pool = require('../config/database');

// Raw, parameterized `pg` queries only -- no business logic (see
// services/projects.service.js).

/*
  Every admin/staff-facing read carries the client's identity.

  Without it the elevated surfaces could only render `Client #12` and raw
  project UUIDs, which meant an admin working the payment verification queue
  was approving money without being able to tell whose it was. Payment
  verification is admin-only specifically for segregation of duties; that
  control is worth little if the person exercising it cannot see the
  counterparty.

  Identity lives across two tables -- `users` holds the credential and role,
  `registration` holds the person -- joined on `registration_uuid`, the same
  shape auth.service.js and users.repository.js already use.

  Both joins are LEFT: a project whose client row is missing or malformed must
  still appear in an admin list with a blank name, never silently vanish from
  it. An inner join here would turn a data problem into an invisible project.

  Client-facing reads (listByClient, findByIdForClient) deliberately skip this
  -- a client already knows who they are, and the columns would be dead weight.
*/
const PROJECT_WITH_CLIENT_SELECT = `
  SELECT p.*,
         r.first_name AS client_first_name,
         r.last_name  AS client_last_name,
         r.email      AS client_email
  FROM projects p
  LEFT JOIN users u ON u.user_id = p.client_id
  LEFT JOIN registration r ON r.registration_uuid = u.registration_uuid`;

async function create({ clientId, packageId, title, requestDetails, referenceCode }, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO projects (client_id, package_id, title, request_details, reference_code)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [clientId, packageId ?? null, title, requestDetails ?? null, referenceCode ?? null]
  );
  return rows[0];
}

// Carries the client join: this backs the admin/staff project detail page as
// well as every internal existence check. The extra columns are additive, so
// internal callers that only read `p.*` fields are unaffected.
async function findById(id, db = pool) {
  const { rows } = await db.query(`${PROJECT_WITH_CLIENT_SELECT} WHERE p.id = $1`, [id]);
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
    where += ` AND p.status_code = $${values.length}`;
  }
  const { rows } = await db.query(
    `${PROJECT_WITH_CLIENT_SELECT} WHERE ${where} ORDER BY p.created_at DESC`,
    values
  );
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
    `${PROJECT_WITH_CLIENT_SELECT}
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
