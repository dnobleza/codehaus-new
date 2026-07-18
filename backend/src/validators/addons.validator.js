const { z } = require('zod');
const xss = require('xss');

function sanitizedString(min, max) {
  return z
    .string()
    .trim()
    .transform((val) => xss(val))
    .pipe(z.string().min(min).max(max));
}

const CATEGORIES = ['authentication', 'dashboard', 'payments', 'reports', 'communication', 'integrations'];

const createAddonSchema = z.object({
  category: z.enum(CATEGORIES),
  name: sanitizedString(1, 120),
  price: z.coerce.number().nonnegative(),
  description: sanitizedString(0, 1000).optional(),
  displayOrder: z.coerce.number().int().min(0).optional().default(0),
});

// See packages.validator.js's comment on why this is a separate, default-
// free schema rather than `createAddonSchema.partial()`.
const updateAddonSchema = z.object({
  category: z.enum(CATEGORIES).optional(),
  name: sanitizedString(1, 120).optional(),
  price: z.coerce.number().nonnegative().optional(),
  description: sanitizedString(0, 1000).optional(),
  displayOrder: z.coerce.number().int().min(0).optional(),
});

module.exports = { createAddonSchema, updateAddonSchema, CATEGORIES };
