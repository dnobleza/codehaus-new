/**
 * The project-status transition graph.
 *
 * WHY THIS IS A JS CONSTANT AND NOT A `project_status_transitions` TABLE
 * ---------------------------------------------------------------------
 * `project_statuses` is a lookup TABLE (004/016/020), so a table here would be
 * the superficially consistent choice. It is the wrong one, for four reasons:
 *
 *   1. The deciding question is "does this need to change without a code
 *      deploy?" -- and the answer must be NO, because transitions are coupled
 *      to code that runs on them. Moving a project to 'in_development' also
 *      generates the milestone template (projectOverview.service.js); 'accepted'
 *      is written by payment verification; 'delivered' is gated on the
 *      installment schedule being fully paid. A graph editable by UPDATE could
 *      enable a transition whose accompanying side-effect code does not exist
 *      or is wrong -- a data change silently altering behaviour, with no review
 *      and no test run.
 *   2. `project_statuses` is a table because it holds DISPLAY DATA -- `label`
 *      and `display_order` are rendered to users, and 016's whole point was
 *      that correcting user-visible wording should be a data change. A
 *      transition graph renders nothing; it is business logic.
 *   3. There is deliberately no admin UI for editing the graph (out of scope).
 *      A table with no UI is edited by hand-written SQL against production --
 *      strictly worse than a reviewed code change: no PR, no tests, and
 *      per-environment divergence. That divergence is not hypothetical here;
 *      this repo's local database sat two migrations behind the migrations
 *      directory while the code assumed otherwise.
 *   4. As a constant it is exercised by the default, database-less unit suite.
 *      As a table it would only be testable by the opt-in integration suite,
 *      i.e. usually not at all.
 *
 * If an admin-editable workflow ever becomes a real product requirement, the
 * migration to a table is mechanical: this map becomes the seed data.
 *
 * WHERE THIS IS ENFORCED (AND WHERE IT IS DELIBERATELY NOT)
 * --------------------------------------------------------
 * Enforced in `projects.service.js#updateProjectStatusAdmin` ONLY -- the single
 * free-form, admin-supplied `status_code` entry point (`PATCH
 * /admin/projects/:id/status`). It is checked IN ADDITION to, not instead of,
 * the `STAFF_ASSIGNABLE_STATUSES` role restriction: that answers "may this
 * ROLE set this status at all", this answers "is this status reachable from
 * where the project currently is". Both must pass.
 *
 * Every other status write in the codebase is a hard-coded transition that is
 * already guarded by its own precondition, and is deliberately NOT routed
 * through this graph:
 *
 *   - projects.service.js#acceptProjectAdmin   -> 'under_review'  (guarded: only from 'submitted')
 *   - projects.service.js#declineProjectAdmin  -> 'cancelled'     (guarded: only from 'submitted')
 *   - projects.service.js#markProjectDeliveredAdmin -> 'delivered'
 *         Deliberately gated on PAYMENT completeness, not on status_code, per
 *         the payment-installment-plan design doc -- delivery readiness is a
 *         build/QA judgment call independent of status sequencing. Forcing it
 *         through the graph would re-introduce exactly the status coupling that
 *         design decision rejected.
 *   - quotations.service.js -> 'quotation_sent' (admin sends/revises a quote),
 *     and -> 'quotation_accepted'/'quotation_rejected' (client responds;
 *     guarded on the quotation being 'sent').
 *   - payments.service.js#verifyPayment -> 'accepted', but ONLY when the
 *         verified payment settles installment 1. The project may legitimately
 *         be in a range of states at that moment, so this is a payment-driven
 *         fact, not a status-driven one.
 *
 * Those callers pass no user-supplied status code -- the hole this graph closes
 * is arbitrary admin-supplied jumps ('submitted' -> 'completed',
 * 'delivered' -> 'draft'), not internal state changes that already have
 * narrower preconditions.
 *
 * RELATIONSHIP TO THE FRONTEND
 * ----------------------------
 * `frontend/src/modules/projects/utils/projectStatus.ts`'s `NEXT_STATUS_MAP`
 * already encodes the product's opinion about sensible next steps, and drives
 * the admin status dropdown. This map is seeded from it deliberately, so that
 * enforcing the graph cannot break a transition the admin UI actually offers.
 *
 * The relationship is intentionally "backend is a SUPERSET of frontend":
 * the frontend map is a UX narrowing (don't show a 22-item dropdown), this is a
 * security/integrity floor. Backend allowing something the UI doesn't offer is
 * harmless; the UI offering something the backend rejects is a broken feature,
 * so that direction is asserted by test
 * (`tests/projectStatusTransitions.test.js` keeps a copy of the frontend map
 * and proves every entry is permitted here). The single intentional superset
 * entry is 'deployed' -> 'delivered', which the graph permits and the dropdown
 * omits because delivery has its own dedicated, payment-gated endpoint.
 */

/**
 * Terminal states -- matching `project_statuses.is_terminal` as set by
 * 016_reconcile_project_statuses.sql. Nothing leaves these. Note that
 * 'delivered' and 'quotation_rejected' are NOT terminal (016's header explains
 * why: a rejected quotation can be followed by a new one, and a delivered
 * project still has to be closed out as 'completed').
 */
const TERMINAL_STATUSES = Object.freeze(['completed', 'cancelled']);

/**
 * Escape hatches reachable from ANY non-terminal status. 016 documents both as
 * "already selectable from any project regardless of its current status_code",
 * and the frontend offers them from every non-terminal state, so they are
 * appended to every non-terminal row rather than repeated in each one.
 */
const ALWAYS_AVAILABLE = Object.freeze(['on_hold', 'cancelled']);

/**
 * The forward progression an ON HOLD project may resume into. Mirrors the
 * frontend's `FORWARD_PROGRESSION` exactly -- an on-hold project is paused, not
 * ended, and the product does not track which status it was paused FROM, so
 * resumption cannot be narrowed further without new schema. (Narrowing this to
 * exclude the pre-commercial states -- 'draft', 'submitted' -- is a sensible
 * follow-up but would contradict the dropdown today, so it is deferred rather
 * than silently diverged.)
 */
const FORWARD_PROGRESSION = Object.freeze([
  'draft',
  'submitted',
  'under_review',
  'waiting_for_client',
  'quotation_sent',
  'quotation_accepted',
  'quotation_rejected',
  'payment_pending',
  'payment_verification',
  'accepted',
  'scheduled',
  'in_development',
  'in_testing',
  'client_review',
  'revision_requested',
  'revision_in_progress',
  'ready_for_deployment',
  'deployed',
  'completed',
]);

/**
 * Adjacency list, keyed by the status a project is currently IN. Values list
 * only the forward/lateral moves; 'on_hold'/'cancelled' are added for every
 * non-terminal key by `getAllowedNextStatuses`, and re-saving the SAME status
 * is always permitted (see `isTransitionAllowed`).
 *
 * All 22 codes in `project_statuses` appear as keys -- an unlisted key would
 * fail closed and strand every project in that state, so
 * `tests/projectStatusTransitions.test.js` asserts full coverage against the
 * migration-derived list.
 */
const PROJECT_STATUS_TRANSITIONS = Object.freeze({
  draft: Object.freeze(['submitted']),
  submitted: Object.freeze(['under_review']),
  under_review: Object.freeze(['waiting_for_client', 'quotation_sent']),
  waiting_for_client: Object.freeze(['under_review', 'quotation_sent']),
  quotation_sent: Object.freeze(['quotation_accepted', 'quotation_rejected']),
  quotation_accepted: Object.freeze(['payment_pending']),
  // Not terminal: a rejected quotation is re-negotiated, either by returning to
  // review or by sending a revised quote (016's header states this outright).
  quotation_rejected: Object.freeze(['under_review', 'quotation_sent']),
  payment_pending: Object.freeze(['payment_verification']),
  // Back to 'payment_pending' is the rejected-payment path: the client must
  // resubmit. (rejectPayment itself does not touch project status, so an admin
  // walks it back here.)
  payment_verification: Object.freeze(['accepted', 'payment_pending']),
  accepted: Object.freeze(['scheduled']),
  scheduled: Object.freeze(['in_development']),
  in_development: Object.freeze(['in_testing']),
  in_testing: Object.freeze(['client_review', 'revision_in_progress']),
  client_review: Object.freeze(['revision_requested', 'ready_for_deployment']),
  revision_requested: Object.freeze(['revision_in_progress']),
  revision_in_progress: Object.freeze(['in_testing']),
  ready_for_deployment: Object.freeze(['deployed']),
  // 'delivered' is the documented step between deployed and completed (020),
  // normally reached through markProjectDeliveredAdmin's payment gate. Permitted
  // here too so the graph is not the thing that forbids the schema's own
  // ordering; see the superset note in the file header.
  deployed: Object.freeze(['delivered', 'completed']),
  delivered: Object.freeze(['completed']),
  completed: Object.freeze([]),
  cancelled: Object.freeze([]),
  on_hold: FORWARD_PROGRESSION,
});

function isTerminalStatus(statusCode) {
  return TERMINAL_STATUSES.includes(statusCode);
}

/**
 * Every status legally reachable from `fromStatus`, escape hatches included.
 * Returns [] for an unknown `fromStatus` -- failing closed, so a status code
 * that somehow exists in the database without a row here cannot become a
 * wildcard.
 */
function getAllowedNextStatuses(fromStatus) {
  const forward = PROJECT_STATUS_TRANSITIONS[fromStatus];
  if (!forward) return [];
  if (isTerminalStatus(fromStatus)) return [];
  return Array.from(new Set([...forward, ...ALWAYS_AVAILABLE]));
}

/**
 * Is moving `fromStatus` -> `toStatus` legal?
 *
 * Re-saving the status a project already has is always allowed, deliberately:
 * `updateProjectStatusAdmin` already treats it as a no-op (it suppresses the
 * client notification in that case, so a repeated admin save doesn't spam the
 * inbox). Turning that existing no-op into a 409 would be a behaviour
 * regression unrelated to the hole this graph closes -- including for the
 * terminal states, where re-saving 'completed' on an already-completed project
 * must stay harmless.
 */
function isTransitionAllowed(fromStatus, toStatus) {
  if (fromStatus === toStatus) return true;
  return getAllowedNextStatuses(fromStatus).includes(toStatus);
}

module.exports = {
  PROJECT_STATUS_TRANSITIONS,
  TERMINAL_STATUSES,
  ALWAYS_AVAILABLE,
  FORWARD_PROGRESSION,
  isTerminalStatus,
  getAllowedNextStatuses,
  isTransitionAllowed,
};
