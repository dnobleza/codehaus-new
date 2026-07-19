const { z } = require('zod');

// Query params for GET /projects/:id/activity. Both arrive as strings (or
// are absent) on a query string, hence z.coerce.number() for limit -- same
// treatment as createPaymentSchema's multipart-field coercion
// (payments.validator.js). `before` is a cursor: the ISO timestamp of the
// oldest row already seen (activity.repository.js filters
// created_at < before), which is exactly what
// projectOverview.service.js's getActivityForClient returns as
// `nextCursor` on the previous page, so round-tripping it back here is a
// straight z.string().datetime() check.
const listActivityQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  before: z.string().datetime().optional(),
});

module.exports = { listActivityQuerySchema };
