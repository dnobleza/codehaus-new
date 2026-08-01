const { z } = require('zod');
const xss = require('xss');

function sanitizedString(min, max) {
  return z
    .string()
    .trim()
    .transform((val) => xss(val))
    .pipe(z.string().min(min).max(max));
}

// Same as sanitizedString(...).optional(), but also accepts an explicit
// empty string (e.g. a client that sends `contactNo: ''` instead of omitting
// the key) and normalizes it to `undefined`, so callers downstream (e.g.
// auth.service.js's `contactNo ?? null`) keep treating "not provided" and
// "provided as empty" identically without needing their own changes.
function optionalSanitizedString(min, max) {
  return sanitizedString(min, max)
    .optional()
    .or(z.literal(''))
    .transform((val) => (val === '' ? undefined : val));
}

const registerSchema = z.object({
  firstName: sanitizedString(1, 100),
  middleName: sanitizedString(1, 100),
  lastName: sanitizedString(1, 100),
  email: z.string().trim().toLowerCase().email().max(255),
  password: z
    .string()
    .min(8)
    .max(72) // bcrypt ignores bytes beyond 72
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[0-9]/, 'Password must contain a digit'),
  contactNo: optionalSanitizedString(1, 30),
  address: optionalSanitizedString(1, 500),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(1).max(72),
});

module.exports = { registerSchema, loginSchema };
