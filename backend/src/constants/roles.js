/**
 * Canonical role values, uppercase to match what `users.role` stores and what
 * therefore travels in the JWT payload.
 *
 * These exist so route files stop passing bare string literals to
 * `requireRole` -- there were 42 of them, and a typo like `requireRole('admn')`
 * fails closed but completely silently, which is the worst way for an
 * authorization bug to behave.
 *
 * `requireRole` normalizes casing on both sides, so passing these constants is
 * equivalent to passing lowercase literals; the value here is that a typo is a
 * `ReferenceError` at require time instead of a permanently-denying route.
 */
const ROLES = Object.freeze({
  CLIENT: 'CLIENT',
  STAFF: 'STAFF',
  ADMIN: 'ADMIN',
});

/**
 * Project status codes a STAFF member is allowed to set.
 *
 * Route-level gating is not sufficient for `PATCH /admin/projects/:id/status`:
 * that one endpoint can express both delivery progress ("we started testing")
 * and commercial outcomes ("this project is completed / cancelled"). Staff owns
 * delivery execution, so only the delivery states belong here. Everything else
 * -- the quotation_*, payment_*, accepted, on_hold, cancelled, completed, and
 * delivered codes -- is a commercial or financial decision and stays with
 * admin. Enforced in projects.service.js#updateProjectStatusAdmin.
 */
const STAFF_ASSIGNABLE_STATUSES = Object.freeze([
  'scheduled',
  'in_development',
  'in_testing',
  'client_review',
  'revision_requested',
  'revision_in_progress',
  'ready_for_deployment',
  'deployed',
  // Delivery is blocked pending client input -- a delivery fact, not a
  // commercial decision, so staff can report it.
  'waiting_for_client',
]);

module.exports = { ROLES, STAFF_ASSIGNABLE_STATUSES };
