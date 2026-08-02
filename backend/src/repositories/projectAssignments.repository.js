const pool = require('../config/database');

// Raw, parameterized `pg` queries only -- no business logic (see
// services/projects.service.js's assignUserToProject / unassignUserFromProject
// / listProjectAssignments for validation and transition rules).

// The one query this whole table exists for: "is this user formally on this
// project's team". Backs requireAssignedOrAdmin.middleware.js and
// projects.repository.js#listAssignedTo. idx_project_assignments_user_id
// (010_create_project_assignments.sql) covers the user_id half of this
// lookup; project_id is the table's own PK prefix.
async function isAssigned(projectId, userId, db = pool) {
  const { rows } = await db.query('SELECT 1 FROM project_assignments WHERE project_id = $1 AND user_id = $2', [
    projectId,
    userId,
  ]);
  return rows.length > 0;
}

async function assign({ projectId, userId, assignedBy }, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO project_assignments (project_id, user_id, assigned_by)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [projectId, userId, assignedBy ?? null]
  );
  return rows[0];
}

async function unassign(projectId, userId, db = pool) {
  const { rows } = await db.query(
    'DELETE FROM project_assignments WHERE project_id = $1 AND user_id = $2 RETURNING *',
    [projectId, userId]
  );
  return rows[0] || null;
}

// Joined to users/registration for a display name, same join shape as
// activity.repository.js's listByProject (users.registration_uuid ->
// registration.first_name/last_name).
async function listByProject(projectId, db = pool) {
  const { rows } = await db.query(
    `SELECT pa.project_id, pa.user_id, pa.assigned_by, pa.assigned_at,
            u.role, r.first_name, r.last_name
     FROM project_assignments pa
     JOIN users u ON u.user_id = pa.user_id
     LEFT JOIN registration r ON r.registration_uuid = u.registration_uuid
     WHERE pa.project_id = $1
     ORDER BY pa.assigned_at ASC`,
    [projectId]
  );
  return rows;
}

module.exports = { isAssigned, assign, unassign, listByProject };
