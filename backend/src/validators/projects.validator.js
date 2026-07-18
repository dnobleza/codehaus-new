const { z } = require('zod');
const xss = require('xss');
const { uuidSchema } = require('./common.validator');

function sanitizedString(min, max) {
  return z
    .string()
    .trim()
    .transform((val) => xss(val))
    .pipe(z.string().min(min).max(max));
}

const createProjectSchema = z.object({
  title: sanitizedString(1, 200),
  requestDetails: sanitizedString(0, 5000).optional(),
  packageId: uuidSchema.nullable().optional(),
});

// Admin/staff-only (see adminProjects.route.js). Deliberately just "is this
// a code that exists in project_statuses" -- there is no state-machine/
// adjacency table in the schema (confirmed in the design doc), so the
// service layer is the enforcement point for who is even allowed to call
// this at all, not this validator.
const adminStatusUpdateSchema = z.object({
  statusCode: z.string().trim().min(1).max(40),
});

// Declining a submitted project request requires a reason (surfaced back to
// the client on their project detail page), so it is a required, non-empty,
// sanitized string -- same treatment as any other free-text field.
const adminDeclineSchema = z.object({
  reason: sanitizedString(1, 5000),
});

module.exports = { createProjectSchema, adminStatusUpdateSchema, adminDeclineSchema };
