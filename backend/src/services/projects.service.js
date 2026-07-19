const pool = require('../config/database');
const projectsRepo = require('../repositories/projects.repository');
const packagesRepo = require('../repositories/packages.repository');
const quotationsRepo = require('../repositories/quotations.repository');
const projectStatusesRepo = require('../repositories/projectStatuses.repository');
const paymentInstallmentsRepo = require('../repositories/paymentInstallments.repository');
const projectOverviewService = require('./projectOverview.service');
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

async function listProjectsAdmin(filters) {
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
async function updateProjectStatusAdmin(id, statusCode) {
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
  logger.info(`${TAG} Project ${id} marked delivered`);
  return updated;
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
};
