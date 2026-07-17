const { z } = require('zod');
const xss = require('xss');

function sanitizedString(min, max) {
  return z
    .string()
    .trim()
    .transform((val) => xss(val))
    .pipe(z.string().min(min).max(max));
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
  contactNo: sanitizedString(1, 30).optional(),
  address: sanitizedString(1, 500).optional(),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(1).max(72),
});

module.exports = { registerSchema, loginSchema };
