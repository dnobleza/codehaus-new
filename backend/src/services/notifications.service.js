const notificationsRepo = require('../repositories/notifications.repository');
const logger = require('../utils/logger');
const TAG = '[NOTIFICATIONS-SERVICE]';

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

// Matches the frontend's `formatPHP` convention (design-system.md currency
// rule: peso symbol, thousands separators, cents only when non-whole) so a
// notification body reads the same as the amount shown everywhere else.
const pesoFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function formatPHP(value) {
  return pesoFormatter.format(Number(value) || 0);
}

/**
 * Copy + destination for every notifiable event, in one place.
 *
 * Each builder returns the pre-rendered `title`/`body` stored on the row (see
 * the migration's comment on why the wording is frozen at write time rather
 * than reconstructed at read time) and the root-relative frontend `link` the
 * notification clicks through to.
 *
 * Keeping these together means adding an event is one entry here plus one
 * `notify` call at the point the event actually happens -- the emitting
 * service never writes copy or knows about frontend routes.
 */
const EVENT_BUILDERS = {
  quotation_sent: ({ projectId, projectTitle, quotationId, quotationNumber }) => ({
    title: 'Your quotation is ready',
    body: `${quotationNumber} for ${projectTitle} is ready for your review.`,
    link: `/client/dashboard/quotations/${projectId}/${quotationId}`,
  }),
  payment_verified: ({ projectTitle, amount }) => ({
    title: 'Payment verified',
    body: `We've verified your ${formatPHP(amount)} payment for ${projectTitle}.`,
    link: '/client/dashboard/invoices',
  }),
  // `reason` mirrors project_declined: the admin is required to supply one
  // (adminRejectPaymentSchema), so the notification leads with what to fix
  // rather than a bare "wasn't verified". Still tolerates a missing reason so
  // a rejection recorded before 028_add_payment_rejection_reason.sql (or by
  // any future non-API code path) degrades to the old copy instead of
  // rendering "undefined" at the client.
  payment_rejected: ({ projectTitle, reason }) => ({
    title: "Payment couldn't be verified",
    body: reason
      ? `Your payment for ${projectTitle} wasn't verified: ${reason} Please resubmit.`
      : `Your payment for ${projectTitle} wasn't verified. Please check the details and resubmit.`,
    link: '/client/dashboard/payments',
  }),
  project_accepted: ({ projectId, projectTitle }) => ({
    title: 'Request accepted',
    body: `We've accepted your request for ${projectTitle} and are preparing your quotation.`,
    link: `/client/dashboard/projects/${projectId}`,
  }),
  project_declined: ({ projectId, projectTitle, reason }) => ({
    title: 'Request declined',
    body: `Your request for ${projectTitle} was declined. ${reason}`,
    link: `/client/dashboard/projects/${projectId}`,
  }),
  project_delivered: ({ projectId, projectTitle }) => ({
    title: 'Project delivered',
    body: `${projectTitle} has been marked delivered. Thank you for working with us!`,
    link: `/client/dashboard/projects/${projectId}`,
  }),
  // Uses the human-readable label from the project_statuses lookup table
  // ("In Development") rather than the raw code ("in_development").
  project_status_changed: ({ projectId, projectTitle, statusLabel }) => ({
    title: 'Project update',
    body: `${projectTitle} is now ${statusLabel}.`,
    link: `/client/dashboard/projects/${projectId}`,
  }),
};

/**
 * Writes one notification for a domain event.
 *
 * Callers pass their open transaction client as `db` so the notification
 * commits or rolls back atomically with the event that caused it -- a client
 * must never be told their payment was verified by a transaction that then
 * rolled back.
 *
 * Deliberately never throws: a notification is a side effect of the real
 * action, and failing to write one must not roll back a verified payment or an
 * accepted project. Failures are logged and swallowed. This is also why it is
 * safe to call from inside an existing transaction without extra guarding.
 */
async function notify({ userId, eventType, projectId, context = {} }, db) {
  try {
    const build = EVENT_BUILDERS[eventType];
    if (!build) {
      logger.warn(`${TAG} Unknown event type ${eventType} -- notification skipped`);
      return null;
    }
    if (!userId) {
      logger.warn(`${TAG} No recipient for ${eventType} -- notification skipped`);
      return null;
    }

    const { title, body, link } = build({ projectId, ...context });
    const notification = await notificationsRepo.insert(
      { userId, projectId, eventType, title, body, link },
      db
    );
    logger.info(`${TAG} Notified user ${userId} of ${eventType}`);
    return notification;
  } catch (error) {
    // Swallowed on purpose -- see this function's doc comment.
    logger.error(`${TAG} Failed to write ${eventType} notification for user ${userId}: ${error.message}`);
    return null;
  }
}

async function listForUser(userId) {
  return notificationsRepo.listByUser(userId);
}

async function countUnreadForUser(userId) {
  return notificationsRepo.countUnread(userId);
}

// 404 (never 403) when the notification isn't the caller's, so the endpoint
// can't be used to discover which ids exist -- same not-found-vs-unauthorized
// collapsing payments.service.js's resolveProofForAccess uses.
async function markReadForUser(id, userId) {
  const updated = await notificationsRepo.markRead(id, userId);
  if (!updated) throw httpError(404, 'Notification not found');
  return updated;
}

async function markAllReadForUser(userId) {
  const count = await notificationsRepo.markAllRead(userId);
  logger.info(`${TAG} Marked ${count} notifications read for user ${userId}`);
  return count;
}

module.exports = {
  notify,
  listForUser,
  countUnreadForUser,
  markReadForUser,
  markAllReadForUser,
};
