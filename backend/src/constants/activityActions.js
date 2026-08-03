/**
 * Canonical `activity_log.action_type` values.
 *
 * These exist for the same reason `ROLES` does: the values are constrained by a
 * database CHECK constraint (022_create_activity_log.sql, widened by
 * 029_add_activity_log_commercial_action_types.sql), so a typo'd string literal
 * fails at INSERT time with an opaque 23514 -- and because these writes sit
 * inside the transaction of the action they audit, that failure would roll back
 * a legitimate payment verification. A constant makes the typo a require-time
 * ReferenceError instead.
 *
 * The delivery-side values were already in use by projectOverview.service.js;
 * they are listed here so this file is the single place the full permitted set
 * can be read off, and so the accompanying test can assert it matches the
 * migration.
 */
const ACTIVITY_ACTIONS = Object.freeze({
  // Delivery events (022).
  FILE_UPLOADED: 'file_uploaded',
  TASK_COMPLETED: 'task_completed',
  PROGRESS_UPDATED: 'progress_updated',
  MILESTONE_COMPLETED: 'milestone_completed',
  COMMENTED: 'commented',

  // Financial and commercial events (029). These are the segregation-of-duties
  // trail: who accepted whose money, and who committed the business to what.
  PAYMENT_VERIFIED: 'payment_verified',
  PAYMENT_REJECTED: 'payment_rejected',
  PROJECT_ACCEPTED: 'project_accepted',
  PROJECT_DECLINED: 'project_declined',
  PROJECT_DELIVERED: 'project_delivered',

  // The sixth commercial action (030), added after 029 shipped without it:
  // the generic PATCH /admin/projects/:id/status endpoint, which moves a
  // project through every transition NOT covered by the five actions above
  // (scheduled, in_testing, on_hold, ...). The transition graph
  // (constants/projectStatusTransitions.js) proves a move was legal; this is
  // what records who made it.
  PROJECT_STATUS_CHANGED: 'project_status_changed',
});

/** The subset that must never be written outside a transaction. */
const FINANCIAL_ACTIONS = Object.freeze([
  ACTIVITY_ACTIONS.PAYMENT_VERIFIED,
  ACTIVITY_ACTIONS.PAYMENT_REJECTED,
  ACTIVITY_ACTIONS.PROJECT_ACCEPTED,
  ACTIVITY_ACTIONS.PROJECT_DECLINED,
  ACTIVITY_ACTIONS.PROJECT_DELIVERED,
  ACTIVITY_ACTIONS.PROJECT_STATUS_CHANGED,
]);

module.exports = { ACTIVITY_ACTIONS, FINANCIAL_ACTIONS };
