const pool = require('../config/database');
const projectsRepo = require('../repositories/projects.repository');
const projectAssignmentsRepo = require('../repositories/projectAssignments.repository');
const packagesRepo = require('../repositories/packages.repository');
const quotationsRepo = require('../repositories/quotations.repository');
const projectStatusesRepo = require('../repositories/projectStatuses.repository');
const paymentInstallmentsRepo = require('../repositories/paymentInstallments.repository');
const projectOverviewService = require('./projectOverview.service');
const notificationsService = require('./notifications.service');
const usersService = require('./users.service');
const { ROLES, STAFF_ASSIGNABLE_STATUSES } = require('../constants/roles');
const logger = require('../utils/logger');
const TAG = '[PROJECTS-SERVICE]';

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

// Generates the next 'CH-<year>-<4-digit per-year sequence>' reference code
// (023_add_projects_reference_code.sql's exact backfill scheme). Must run
// inside the SAME transaction as the INSERT it feeds (see createProject) to
// avoid two concurrent creates computing the same "next" sequence.
//
// Collision-safety approach: rather than a second UNIQUE-violation-and-retry
// loop, this takes a per-year Postgres advisory transaction lock
// (pg_advisory_xact_lock, auto-released at COMMIT/ROLLBACK) before reading
// the current max sequence for that year, so concurrent createProject calls
// for the same year are serialized at exactly the one point that matters,
// without locking/scanning the whole projects table.
async function generateReferenceCode(client, year) {
  await client.query('SELECT pg_advisory_xact_lock($1)', [year]);

  // 'CH-YYYY-' is always 8 characters, so the sequence portion starts at
  // position 9 -- works for any 4-digit year.
  const { rows } = await client.query(
    `SELECT COALESCE(MAX(SUBSTRING(reference_code FROM 9)::INT), 0) AS max_sequence
     FROM projects
     WHERE reference_code LIKE $1`,
    [`CH-${year}-%`]
  );
  const nextSequence = Number(rows[0].max_sequence) + 1;
  return `CH-${year}-${String(nextSequence).padStart(4, '0')}`;
}

async function createProject({ clientId, title, requestDetails, packageId }) {
  if (packageId) {
    const pkg = await packagesRepo.findCoreById(packageId);
    if (!pkg || !pkg.is_active) {
      throw httpError(400, 'Selected package does not exist or is not currently available');
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const referenceCode = await generateReferenceCode(client, new Date().getFullYear());
    const project = await projectsRepo.create({ clientId, packageId, title, requestDetails, referenceCode }, client);

    await client.query('COMMIT');
    logger.info(`${TAG} Client ${clientId} created project ${project.id} (${referenceCode})`);
    return project;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function listProjectsForClient(clientId, filters) {
  return projectsRepo.listByClient(clientId, filters);
}

// Includes nested quotations (with their addons) so the client has
// everything needed to render "your quotation" and call
// accept/reject with the right quotationId, without a separate endpoint.
async function getProjectForClient(id, clientId) {
  const project = await projectsRepo.findByIdForClient(id, clientId);
  if (!project) throw httpError(404, 'Project not found');
  const quotations = await quotationsRepo.listByProjectWithAddons(id);
  const paymentInstallments = await paymentInstallmentsRepo.listByProject(id);
  return { ...project, quotations, paymentInstallments };
}

// `actorRole`/`actorUserId` scope the LIST endpoint the same way `actorRole`
// scopes updateProjectStatusAdmin below: STAFF only sees projects they are
// formally assigned to (project_assignments), ADMIN keeps seeing everything.
// Route-level gating (requireAssignedOrAdmin) can't express this one --
// there is no :id on the list route -- so the role has to travel all the way
// through to the repository, which is the only layer that knows how to
// filter by assignment.
async function listProjectsAdmin(filters, actorRole, actorUserId) {
  const role = actorRole ? String(actorRole).toUpperCase() : null;
  if (role === ROLES.STAFF) {
    return projectsRepo.listAssignedTo(actorUserId, filters);
  }
  return projectsRepo.listAll(filters);
}

async function getProjectAdmin(id) {
  const project = await projectsRepo.findById(id);
  if (!project) throw httpError(404, 'Project not found');
  const quotations = await quotationsRepo.listByProjectWithAddons(id);
  const paymentInstallments = await paymentInstallmentsRepo.listByProject(id);
  return { ...project, quotations, paymentInstallments };
}

// Judgment call (documented per task brief): the schema has no state-
// machine/adjacency table for project_statuses (confirmed in the design
// doc -- it is a flat lookup), so nothing at the DATA layer stops any
// status_code that exists in project_statuses from being set here. The
// actual enforcement of "clients can't set arbitrary status" is that this
// function is ONLY ever reachable from the admin/staff route
// (adminProjects.route.js gates it with requireRole('admin', 'staff')) --
// there is no generic PATCH /projects/:id/status reachable by role CLIENT
// anywhere in this API. The only project-status transitions a client CAN
// trigger are the narrow, hard-coded ones inside quotations.service
// (accept -> 'quotation_accepted', reject -> 'quotation_rejected') and
// payments.service (submit payment -> 'payment_verification', admin
// verifies -> 'accepted'). This keeps the allow-list simple (role-based
// route gating) instead of building a parallel status-transition-graph
// just for this one admin endpoint.
// Wrapped in a transaction (unlike the other simple status-mutating
// functions in this file) because a transition to 'in_development' must
// ALSO generate the standard milestone template (see
// projectOverview.service.js's generateMilestoneTemplate) in the same
// atomic step -- per the stage-2 Project Overview brief, that is the real
// trigger for the template, not the manual admin ops endpoint. Both writes
// commit or roll back together.
//
// `actorRole` gates WHICH statuses the caller may set. This endpoint is the one
// place where delivery progress ("in testing") and commercial outcomes
// ("completed", "cancelled") share a single route, so route-level gating cannot
// express the rule on its own -- staff legitimately needs this endpoint, but
// must not be able to declare a project completed or cancelled. Omitting
// `actorRole` (internal callers) applies no restriction.
async function updateProjectStatusAdmin(id, statusCode, actorRole) {
  const role = actorRole ? String(actorRole).toUpperCase() : null;
  if (role === ROLES.STAFF && !STAFF_ASSIGNABLE_STATUSES.includes(statusCode)) {
    logger.info(`${TAG} Staff denied status "${statusCode}" on project ${id}`);
    throw httpError(403, 'You do not have permission to set this project status');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const project = await projectsRepo.findById(id, client);
    if (!project) throw httpError(404, 'Project not found');

    const validStatus = await projectStatusesRepo.exists(statusCode, client);
    if (!validStatus) throw httpError(400, `Unknown status_code: ${statusCode}`);

    const updated = await projectsRepo.updateStatus(id, statusCode, client);

    if (statusCode === 'in_development') {
      await projectOverviewService.generateMilestoneTemplate(id, client);
    }

    // Only on an actual transition. Re-applying the status a project already
    // has is a no-op for the client, and notifying would let a repeated admin
    // save spam their inbox with "is now In Development" over and over.
    if (project.status_code !== statusCode) {
      const status = await projectStatusesRepo.findByCode(statusCode, client);
      await notificationsService.notify(
        {
          userId: project.client_id,
          eventType: 'project_status_changed',
          projectId: id,
          context: { projectTitle: project.title, statusLabel: status?.label ?? statusCode },
        },
        client
      );
    }

    await client.query('COMMIT');
    logger.info(`${TAG} Project ${id} status set to ${statusCode}`);
    return updated;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Accept / decline are the two admin actions on a freshly SUBMITTED project
// request. Unlike updateProjectStatusAdmin (which is a free-form status change
// with no transition guard), these two are only legal from the 'submitted'
// state -- a project already under review, cancelled, in development, etc.
// must not be re-accepted/re-declined -- so they enforce that guard here
// (409 Conflict), on top of the shared 404-if-missing check.
async function acceptProjectAdmin(id) {
  const project = await projectsRepo.findById(id);
  if (!project) throw httpError(404, 'Project not found');
  if (project.status_code !== 'submitted') {
    throw httpError(409, 'Only a submitted project request can be accepted');
  }

  const updated = await projectsRepo.updateStatus(id, 'under_review');

  await notificationsService.notify({
    userId: project.client_id,
    eventType: 'project_accepted',
    projectId: id,
    context: { projectTitle: project.title },
  });

  logger.info(`${TAG} Project ${id} accepted -> under_review`);
  return updated;
}

async function declineProjectAdmin(id, reason) {
  const project = await projectsRepo.findById(id);
  if (!project) throw httpError(404, 'Project not found');
  if (project.status_code !== 'submitted') {
    throw httpError(409, 'Only a submitted project request can be declined');
  }

  const updated = await projectsRepo.decline(id, reason);

  await notificationsService.notify({
    userId: project.client_id,
    eventType: 'project_declined',
    projectId: id,
    context: { projectTitle: project.title, reason },
  });

  logger.info(`${TAG} Project ${id} declined -> cancelled`);
  return updated;
}

// Admin/staff-only. Gated purely on payment completion -- ALL of a
// project's payment_installments must be 'paid' -- not on status_code, per
// docs/superpowers/specs/2026-07-18-payment-installment-plan-design.md:
// delivery readiness is a build/QA judgment call, independent of exact
// status-sequencing.
async function markProjectDeliveredAdmin(id) {
  const project = await projectsRepo.findById(id);
  if (!project) throw httpError(404, 'Project not found');

  const totalInstallments = await paymentInstallmentsRepo.countForProject(id);
  if (totalInstallments === 0) {
    throw httpError(409, 'This project has no payment schedule yet; nothing to deliver against');
  }

  const pendingInstallments = await paymentInstallmentsRepo.countPending(id);
  if (pendingInstallments > 0) {
    throw httpError(409, `Project is not fully paid; ${pendingInstallments} installment(s) remaining`);
  }

  const updated = await projectsRepo.updateStatus(id, 'delivered');

  await notificationsService.notify({
    userId: project.client_id,
    eventType: 'project_delivered',
    projectId: id,
    context: { projectTitle: project.title },
  });

  logger.info(`${TAG} Project ${id} marked delivered`);
  return updated;
}

// Assignment management (admin-only, see adminProjects.route.js). Inert
// without these: 1.3's read-scoping has no way to actually put a staff
// member on a team otherwise. All three re-check the project exists first
// so a bad :id 404s here rather than surfacing as an opaque FK failure.
async function assignUserToProject(projectId, userId, assignedByUserId) {
  const project = await projectsRepo.findById(projectId);
  if (!project) throw httpError(404, 'Project not found');

  // Existence, active state, and role are all checked up front now that a
  // users repository exists. The FK-violation fallback below stays as a
  // backstop for the race where the user is deleted between these two steps.
  await usersService.assertAssignable(userId);

  try {
    const assignment = await projectAssignmentsRepo.assign({
      projectId,
      userId,
      assignedBy: assignedByUserId,
    });
    logger.info(`${TAG} User ${userId} assigned to project ${projectId} by ${assignedByUserId}`);
    return assignment;
  } catch (error) {
    // 23505: project_assignments' PK is (project_id, user_id) -- this user
    // is already on this project's team.
    if (error.code === '23505') throw httpError(409, 'This user is already assigned to this project');
    // 23503: user_id has no matching row in users. There is no users
    // repository in this codebase to pre-check existence against (see task
    // notes: the users table itself has no creating migration), so the FK
    // violation IS the existence check.
    if (error.code === '23503') throw httpError(404, 'User not found');
    throw error;
  }
}

async function unassignUserFromProject(projectId, userId) {
  const project = await projectsRepo.findById(projectId);
  if (!project) throw httpError(404, 'Project not found');

  const removed = await projectAssignmentsRepo.unassign(projectId, userId);
  if (!removed) throw httpError(404, 'This user is not assigned to this project');

  logger.info(`${TAG} User ${userId} unassigned from project ${projectId}`);
  return removed;
}

// Reachable by admin unconditionally and by staff only if requireAssignedOrAdmin
// already let them through (adminProjects.route.js) -- no further role check
// needed here.
async function listProjectAssignments(projectId) {
  const project = await projectsRepo.findById(projectId);
  if (!project) throw httpError(404, 'Project not found');
  return projectAssignmentsRepo.listByProject(projectId);
}

module.exports = {
  createProject,
  listProjectsForClient,
  getProjectForClient,
  listProjectsAdmin,
  getProjectAdmin,
  updateProjectStatusAdmin,
  acceptProjectAdmin,
  declineProjectAdmin,
  markProjectDeliveredAdmin,
  assignUserToProject,
  unassignUserFromProject,
  listProjectAssignments,
};
