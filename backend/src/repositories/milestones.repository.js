const pool = require('../config/database');

// Raw, parameterized `pg` queries only -- no business logic (template
// generation, idempotency, and progress/activity orchestration all live in
// services/projectOverview.service.js). Every function accepts the pg
// client/pool as its last argument (defaulting to the shared pool) so
// callers running inside a BEGIN/COMMIT transaction can pass their checked-
// out client through -- same convention as quotations.repository.js /
// paymentInstallments.repository.js.

async function listByProject(projectId, db = pool) {
  const { rows } = await db.query('SELECT * FROM milestones WHERE project_id = $1 ORDER BY sequence ASC', [
    projectId,
  ]);
  return rows;
}

async function findById(id, db = pool) {
  const { rows } = await db.query('SELECT * FROM milestones WHERE id = $1', [id]);
  return rows[0] || null;
}

// Used by the status-transition hook (projects.service.js) and the manual
// ops-trigger endpoint (POST /admin/projects/:id/milestones/generate) --
// both call this already inside a BEGIN/COMMIT they own (see
// projectOverview.service.js's generateMilestoneTemplate), so this stays a
// plain loop of parameterized inserts, not its own transaction.
async function bulkCreate(projectId, milestones, db = pool) {
  const created = [];
  for (const milestone of milestones) {
    const { rows } = await db.query(
      `INSERT INTO milestones (project_id, sequence, name, status, progress_percent, start_date, end_date, current_focus)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        projectId,
        milestone.sequence,
        milestone.name,
        milestone.status,
        milestone.progressPercent,
        milestone.startDate ?? null,
        milestone.endDate ?? null,
        milestone.currentFocus ?? null,
      ]
    );
    created.push(rows[0]);
  }
  return created;
}

async function updateProgress(id, { progressPercent, status, currentFocus }, db = pool) {
  const { rows } = await db.query(
    `UPDATE milestones
     SET progress_percent = $1, status = $2, current_focus = $3
     WHERE id = $4
     RETURNING *`,
    [progressPercent, status, currentFocus ?? null, id]
  );
  return rows[0] || null;
}

module.exports = { listByProject, findById, bulkCreate, updateProgress };
