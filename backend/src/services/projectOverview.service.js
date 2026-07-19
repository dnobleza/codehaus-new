const pool = require('../config/database');
const projectsRepo = require('../repositories/projects.repository');
const milestonesRepo = require('../repositories/milestones.repository');
const activityRepo = require('../repositories/activity.repository');
const { todayDateString, daysBetweenDateStrings } = require('../utils/date');
const logger = require('../utils/logger');
const TAG = '[PROJECT-OVERVIEW-SERVICE]';

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

const RECENT_ACTIVITY_LIMIT = 5;

// The standard 5-phase delivery plan every project gets once it enters
// active development (see 021_create_milestones.sql /
// 024_seed_milestone_demo_data.sql for the same 5 names/ordering). All rows
// start not_started/0%/undated -- real dates and progress are filled in by
// updateMilestoneProgress as the team actually works the plan, not
// guessed at generation time.
const MILESTONE_TEMPLATE = [
  { sequence: 1, name: 'Project Planning' },
  { sequence: 2, name: 'Design & Prototyping' },
  { sequence: 3, name: 'Frontend Development' },
  { sequence: 4, name: 'Backend Development' },
  { sequence: 5, name: 'Testing & Deployment' },
];

// -- Presenters: map snake_case DB rows to the camelCase shape the
// "Project Overview" page's frontend engineer will build directly against
// (see the stage-2 brief's exact field list). Kept local to this service
// (not a shared utils/presenter file) because this exact shape only exists
// for this feature's endpoints -- the rest of the codebase's project/
// payment responses intentionally echo raw DB rows (see
// getProjectForClient / paymentPresenter.js's narrower proof-URL-only
// swap).

function presentProject(project) {
  return {
    id: project.id,
    referenceCode: project.reference_code,
    title: project.title,
    statusCode: project.status_code,
    createdAt: project.created_at,
  };
}

function presentMilestone(milestone) {
  return {
    id: milestone.id,
    sequence: milestone.sequence,
    name: milestone.name,
    status: milestone.status,
    progressPercent: milestone.progress_percent,
    startDate: milestone.start_date,
    endDate: milestone.end_date,
    currentFocus: milestone.current_focus,
  };
}

function presentActivity(row) {
  return {
    id: row.id,
    actionType: row.action_type,
    summary: row.summary,
    metadata: row.metadata,
    createdAt: row.created_at,
    actor: row.actor_user_id
      ? { id: row.actor_user_id, firstName: row.actor_first_name, lastName: row.actor_last_name }
      : null,
  };
}

// overallProgressPercent is deliberately NOT a stored column -- it is
// derived fresh from the current milestones every time (per the brief), so
// it can never drift out of sync with the individual milestone rows the
// way a cached/duplicated total could.
function computeOverallProgress(milestones) {
  if (milestones.length === 0) return 0;
  const total = milestones.reduce((sum, milestone) => sum + Number(milestone.progress_percent), 0);
  return Math.round(total / milestones.length);
}

// The furthest-out end_date among a project's milestones is the best
// available "when will this project realistically be done" estimate --
// projects.end_date/completion_date are never populated by any workflow in
// this codebase (confirmed: only milestones carry real dates), so this is
// computed from milestone data rather than a project column. Plain
// 'YYYY-MM-DD' strings compare correctly with a lexicographic max, no Date
// parsing needed (see utils/date.js for why that matters).
function computeEstimatedCompletionDate(milestones) {
  const endDates = milestones.map((milestone) => milestone.end_date).filter(Boolean);
  if (endDates.length === 0) return null;
  return endDates.reduce((latest, current) => (current > latest ? current : latest));
}

// Client-facing (GET /projects/:id/overview). 404s (never leaks ownership
// via 403) using the same findByIdForClient scoping every other client
// project endpoint uses (projects.service.js's getProjectForClient).
async function getOverviewForClient(projectId, clientUserId) {
  const project = await projectsRepo.findByIdForClient(projectId, clientUserId);
  if (!project) throw httpError(404, 'Project not found');

  const milestones = await milestonesRepo.listByProject(projectId);
  const recentActivity = await activityRepo.listByProject(projectId, { limit: RECENT_ACTIVITY_LIMIT });

  const overallProgressPercent = computeOverallProgress(milestones);
  const estimatedCompletionDate = computeEstimatedCompletionDate(milestones);
  const daysLeft = estimatedCompletionDate
    ? daysBetweenDateStrings(estimatedCompletionDate, todayDateString())
    : null;

  return {
    project: presentProject(project),
    overallProgressPercent,
    estimatedCompletionDate,
    daysLeft,
    milestones: milestones.map(presentMilestone),
    recentActivity: recentActivity.map(presentActivity),
  };
}

// Client-facing (GET /projects/:id/activity). Same ownership check as
// getOverviewForClient, but returns the FULL paginated feed rather than
// the ~5-row preview.
async function getActivityForClient(projectId, clientUserId, { limit, before } = {}) {
  const project = await projectsRepo.findByIdForClient(projectId, clientUserId);
  if (!project) throw httpError(404, 'Project not found');

  const rows = await activityRepo.listByProject(projectId, { limit, before });
  // A full page implies there may be more; a short page is the end of the
  // feed. Cheap "is there a next page" signal without a separate COUNT(*).
  const nextCursor = limit && rows.length === limit ? rows[rows.length - 1].created_at.toISOString() : null;

  return { activity: rows.map(presentActivity), nextCursor };
}

// Idempotent + transactional per the brief: a no-op if the project already
// has any milestones (never re-generates on top of real progress), and
// always called with a `db` already inside a BEGIN/COMMIT it does not open
// itself -- either the status-transition hook below (projects.service.js's
// updateProjectStatusAdmin) or generateMilestoneTemplateAdmin's own
// transaction for the manual ops-trigger endpoint.
async function generateMilestoneTemplate(projectId, db) {
  const existing = await milestonesRepo.listByProject(projectId, db);
  if (existing.length > 0) {
    logger.info(`${TAG} Milestone template generation skipped for project ${projectId} (already has milestones)`);
    return existing;
  }

  const rows = MILESTONE_TEMPLATE.map((phase) => ({
    sequence: phase.sequence,
    name: phase.name,
    status: 'not_started',
    progressPercent: 0,
    startDate: null,
    endDate: null,
    currentFocus: null,
  }));

  const created = await milestonesRepo.bulkCreate(projectId, rows, db);
  logger.info(`${TAG} Generated 5-phase milestone template for project ${projectId}`);
  return created;
}

// Admin/staff-only (POST /admin/projects/:id/milestones/generate). Manual
// trigger for ops/testing -- the real trigger is projects.service.js's
// updateProjectStatusAdmin hook when a project transitions to
// 'in_development'. Opens its own transaction since (unlike the hook) there
// is no enclosing one to join.
async function generateMilestoneTemplateAdmin(projectId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const project = await projectsRepo.findById(projectId, client);
    if (!project) throw httpError(404, 'Project not found');

    const milestones = await generateMilestoneTemplate(projectId, client);

    await client.query('COMMIT');
    return milestones.map(presentMilestone);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function inferStatus(progressPercent) {
  if (progressPercent === 100) return 'completed';
  if (progressPercent === 0) return 'not_started';
  return 'in_progress';
}

// Admin/staff-only (PATCH /admin/projects/:id/milestones/:milestoneId).
// Updates the milestone AND writes the accompanying activity_log row in
// the SAME transaction (per the brief) -- a progress update that "took"
// but silently failed to narrate itself in the activity feed (or vice
// versa) would leave the two data sources inconsistent, so both writes
// commit or roll back together.
async function updateMilestoneProgress(projectId, milestoneId, { progressPercent, status, currentFocus }, actorUserId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      'SELECT * FROM milestones WHERE id = $1 AND project_id = $2 FOR UPDATE',
      [milestoneId, projectId]
    );
    const milestone = rows[0];
    if (!milestone) throw httpError(404, 'Milestone not found');

    const resolvedStatus = status ?? inferStatus(progressPercent);
    // currentFocus: undefined (field omitted) leaves the existing value
    // untouched; null explicitly clears it; a string sets it -- see
    // milestones.validator.js's optionalNullableSanitizedString.
    const resolvedCurrentFocus = currentFocus === undefined ? milestone.current_focus : currentFocus;

    const updated = await milestonesRepo.updateProgress(
      milestoneId,
      { progressPercent, status: resolvedStatus, currentFocus: resolvedCurrentFocus },
      client
    );

    const fromPercent = milestone.progress_percent;
    const actionType = progressPercent === 100 ? 'milestone_completed' : 'progress_updated';
    const summary =
      actionType === 'milestone_completed'
        ? `marked milestone "${milestone.name}" as completed`
        : `updated progress on ${milestone.name}: ${fromPercent}% → ${progressPercent}%`;

    await activityRepo.create(
      {
        projectId,
        actorUserId,
        actionType,
        summary,
        metadata: { from: fromPercent, to: progressPercent, target: milestone.name },
      },
      client
    );

    await client.query('COMMIT');
    logger.info(
      `${TAG} Milestone ${milestoneId} (project ${projectId}) progress updated ${fromPercent}% -> ${progressPercent}% by user ${actorUserId}`
    );
    return presentMilestone(updated);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  getOverviewForClient,
  getActivityForClient,
  generateMilestoneTemplate,
  generateMilestoneTemplateAdmin,
  updateMilestoneProgress,
};
