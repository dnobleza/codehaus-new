const { z } = require('zod');
const xss = require('xss');

const MILESTONE_STATUSES = ['not_started', 'in_progress', 'completed'];

// Nullable AND optional (unlike packages.validator.js's optionalSanitizedString,
// which is only optional): a staff member updating progress may want to
// explicitly CLEAR current_focus (send null, e.g. once a milestone finishes
// and the "what we're working on" line no longer applies) as distinct from
// simply not touching it (omit the field). See
// projectOverview.service.js's updateMilestoneProgress for how `undefined`
// (leave as-is) vs `null` (clear) vs a string (set) are each handled.
const optionalNullableSanitizedString = (max) =>
  z
    .string()
    .trim()
    .transform((val) => xss(val))
    .pipe(z.string().max(max))
    .nullable()
    .optional();

// progressPercent is required -- it is the whole point of this endpoint
// (PATCH /admin/projects/:id/milestones/:milestoneId) and drives the
// human-readable "X% -> Y%" activity_log summary generated in the service
// layer. status is optional: if omitted, the service infers it from
// progressPercent (0 -> not_started, 1-99 -> in_progress, 100 -> completed)
// so a caller doesn't have to keep both in sync by hand; passing it
// explicitly still overrides that inference.
const updateMilestoneProgressSchema = z.object({
  progressPercent: z.coerce.number().int().min(0).max(100),
  status: z.enum(MILESTONE_STATUSES).optional(),
  currentFocus: optionalNullableSanitizedString(500),
});

module.exports = { updateMilestoneProgressSchema, MILESTONE_STATUSES };
