const logger = require('../utils/logger');
const projectAssignmentsRepo = require('../repositories/projectAssignments.repository');
const { ROLES } = require('../constants/roles');
const TAG = '[REQUIRE-ASSIGNED-OR-ADMIN]';

/*
  Gate for the per-project delivery routes STAFF can reach (GET /:id, PATCH
  /:id/status, the milestone routes, GET /:id/assignments). ADMIN owns the
  whole ledger, so it passes unconditionally -- no lookup needed, and
  therefore no DB round trip on the admin path at all. STAFF only gets past
  here if project_assignments actually names them on this project's team;
  otherwise 403. Any other role that somehow reaches this middleware (it is
  meant to run immediately after a requireRole(ADMIN, STAFF) check) is denied
  too, as a defensive fallback rather than a silent pass-through.

  Note this is called `projectAssignmentsRepo.isAssigned(...)` as a property
  access at call time (not destructured at require time) specifically so it
  stays swappable for tests -- see tests/assignmentScoping.test.js.
*/
async function requireAssignedOrAdmin(req, res, next) {
  const role = req.user?.role ? String(req.user.role).toUpperCase() : null;

  if (role === ROLES.ADMIN) return next();

  if (role !== ROLES.STAFF) {
    logger.info(`${TAG} Denied role "${role}" (not admin or staff)`);
    return res.status(403).json({ success: false, message: 'You do not have permission to perform this action' });
  }

  try {
    const assigned = await projectAssignmentsRepo.isAssigned(req.params.id, req.user.id);
    if (!assigned) {
      logger.info(`${TAG} Denied staff user ${req.user.id} on project ${req.params.id} (not assigned)`);
      return res.status(403).json({ success: false, message: 'You are not assigned to this project' });
    }
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = { requireAssignedOrAdmin };
