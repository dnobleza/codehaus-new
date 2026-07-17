import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

// Mirrors backend/src/validators/auth.validator.js exactly. Note: the
// backend's registerSchema does NOT mark middleName as .optional() (only
// contactNo/address are optional there), so it is required here too even
// though the task brief described it as optional — the live validator wins.
export const registerSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  middleName: z.string().trim().min(1, 'Middle name is required').max(100),
  lastName: z.string().trim().min(1, 'Last name is required').max(100),
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(255),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72)
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[0-9]/, 'Password must contain a digit'),
  contactNo: z.string().trim().max(30).optional().or(z.literal('')),
  address: z.string().trim().max(500).optional().or(z.literal('')),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;
