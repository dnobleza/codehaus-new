const pool = require('../config/database');

// Raw, parameterized `pg` queries only -- no business logic (see
// services/projects.service.js).

async function create({ clientId, packageId, title, requestDetails }, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO projects (client_id, package_id, title, request_details)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [clientId, packageId ?? null, title, requestDetails ?? null]
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

module.exports = { create, findById, findByIdForClient, listByClient, listAll, updateStatus, decline };
