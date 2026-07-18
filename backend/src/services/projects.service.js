const projectsRepo = require('../repositories/projects.repository');
const packagesRepo = require('../repositories/packages.repository');
const quotationsRepo = require('../repositories/quotations.repository');
const projectStatusesRepo = require('../repositories/projectStatuses.repository');
const logger = require('../utils/logger');
const TAG = '[PROJECTS-SERVICE]';

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function createProject({ clientId, title, requestDetails, packageId }) {
  if (packageId) {
    const pkg = await packagesRepo.findCoreById(packageId);
    if (!pkg || !pkg.is_active) {
      throw httpError(400, 'Selected package does not exist or is not currently available');
    }
  }

  const project = await projectsRepo.create({ clientId, packageId, title, requestDetails });
  logger.info(`${TAG} Client ${clientId} created project ${project.id}`);
  return project;
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
  return { ...project, quotations };
}

async function listProjectsAdmin(filters) {
  return projectsRepo.listAll(filters);
}

async function getProjectAdmin(id) {
  const project = await projectsRepo.findById(id);
  if (!project) throw httpError(404, 'Project not found');
  const quotations = await quotationsRepo.listByProjectWithAddons(id);
  return { ...project, quotations };
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
async function updateProjectStatusAdmin(id, statusCode) {
  const project = await projectsRepo.findById(id);
  if (!project) throw httpError(404, 'Project not found');

  const validStatus = await projectStatusesRepo.exists(statusCode);
  if (!validStatus) throw httpError(400, `Unknown status_code: ${statusCode}`);

  const updated = await projectsRepo.updateStatus(id, statusCode);
  logger.info(`${TAG} Project ${id} status set to ${statusCode}`);
  return updated;
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

module.exports = {
  createProject,
  listProjectsForClient,
  getProjectForClient,
  listProjectsAdmin,
  getProjectAdmin,
  updateProjectStatusAdmin,
  acceptProjectAdmin,
  declineProjectAdmin,
};
