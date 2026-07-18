const { z } = require('zod');
const xss = require('xss');

function sanitizedString(min, max) {
  return z
    .string()
    .trim()
    .transform((val) => xss(val))
    .pipe(z.string().min(min).max(max));
}

function optionalSanitizedString(max) {
  return z
    .string()
    .trim()
    .transform((val) => xss(val))
    .pipe(z.string().max(max))
    .optional();
}

const createPackageSchema = z.object({
  name: sanitizedString(1, 120),
  slug: sanitizedString(1, 140).optional(),
  description: optionalSanitizedString(2000),
  basePrice: z.coerce.number().nonnegative().nullable().optional(),
  estimatedTimelineMinDays: z.coerce.number().int().nonnegative().nullable().optional(),
  estimatedTimelineMaxDays: z.coerce.number().int().nonnegative().nullable().optional(),
  displayOrder: z.coerce.number().int().min(0).optional().default(0),
  isCustom: z.coerce.boolean().optional().default(false),
});

// Deliberately NOT `createPackageSchema.partial()`. Verified empirically:
// zod's `.default()` still fires on a field that is omitted from the input
// even after `.partial()` wraps it in `.optional()` -- `.partial()` only
// stops the field from being *required*, it does not stop `.default()` from
// substituting a value for `undefined`. Using `.partial()` here would mean
// a PATCH that omits `displayOrder`/`isCustom` silently resets them to
// 0/false on every partial update, which is exactly the kind of case-
// sensitivity-style silent bug this project has already been bitten by
// once today. This schema instead repeats each field's validator with NO
// `.default()`, so an omitted field is simply absent from the parsed
// result, and the repository's hasOwnProperty-based dynamic UPDATE leaves
// that column untouched.
const updatePackageSchema = z.object({
  name: sanitizedString(1, 120).optional(),
  slug: sanitizedString(1, 140).optional(),
  description: optionalSanitizedString(2000),
  basePrice: z.coerce.number().nonnegative().nullable().optional(),
  estimatedTimelineMinDays: z.coerce.number().int().nonnegative().nullable().optional(),
  estimatedTimelineMaxDays: z.coerce.number().int().nonnegative().nullable().optional(),
  displayOrder: z.coerce.number().int().min(0).optional(),
  isCustom: z.coerce.boolean().optional(),
});

const pageOrFeatureCreateSchema = z.object({
  name: sanitizedString(1, 160),
  displayOrder: z.coerce.number().int().min(0).optional().default(0),
});

// Same `.default()`-under-partial pitfall as above -- kept as a separate,
// default-free schema rather than `.partial()`.
const pageOrFeatureUpdateSchema = z.object({
  name: sanitizedString(1, 160).optional(),
  displayOrder: z.coerce.number().int().min(0).optional(),
});

module.exports = {
  createPackageSchema,
  updatePackageSchema,
  pageOrFeatureCreateSchema,
  pageOrFeatureUpdateSchema,
};
