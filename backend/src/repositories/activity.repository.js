const pool = require('../config/database');

// Raw, parameterized `pg` queries only -- no business logic (see
// services/projectOverview.service.js for summary text generation and
// transaction orchestration). activity_log is append-only, so this file
// only ever needs a paginated read and a single insert.
//
// listByProject joins to users/registration (not activity_log alone) so
// callers get the acting user's name in one round trip instead of an N+1 --
// names live on `registration`, joined via `users.registration_uuid` (see
// auth.service.js's loginUser for the same join shape). actor_user_id is
// nullable (ON DELETE SET NULL), so this is a LEFT JOIN.

async function listByProject(projectId, { limit = 20, before } = {}, db = pool) {
  const values = [projectId];
  let where = 'al.project_id = $1';

  // Cursor pagination on created_at: "before" is the created_at of the last
  // row from the previous page, matching the table's own
  // (project_id, created_at DESC) index (022_create_activity_log.sql) --
  // no offset/count scan needed.
  if (before) {
    values.push(before);
    where += ` AND al.created_at < $${values.length}`;
  }

  values.push(limit);

  const { rows } = await db.query(
    `SELECT al.id, al.project_id, al.actor_user_id, al.action_type, al.summary, al.metadata, al.created_at,
            r.first_name AS actor_first_name, r.last_name AS actor_last_name
     FROM activity_log al
     LEFT JOIN users u ON u.user_id = al.actor_user_id
     LEFT JOIN registration r ON r.registration_uuid = u.registration_uuid
     WHERE ${where}
     ORDER BY al.created_at DESC
     LIMIT $${values.length}`,
    values
  );
  return rows;
}

async function create({ projectId, actorUserId, actionType, summary, metadata }, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO activity_log (project_id, actor_user_id, action_type, summary, metadata)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING *`,
    [projectId, actorUserId ?? null, actionType, summary, metadata ? JSON.stringify(metadata) : null]
  );
  return rows[0];
}

module.exports = { listByProject, create };
