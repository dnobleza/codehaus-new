import { z } from 'zod';

/** Mirrors `backend/src/validators/addons.validator.js`'s `createAddonSchema`/`updateAddonSchema`. */
export const ADDON_CATEGORY_OPTIONS = [
  { value: 'authentication', label: 'Authentication' },
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'payments', label: 'Payments' },
  { value: 'reports', label: 'Reports' },
  { value: 'communication', label: 'Communication' },
  { value: 'integrations', label: 'Integrations' },
] as const;

export const addonFormSchema = z.object({
  category: z.enum([
    'authentication',
    'dashboard',
    'payments',
    'reports',
    'communication',
    'integrations',
  ]),
  name: z.string().trim().min(1, 'Name is required').max(120),
  price: z
    .string()
    .trim()
    .min(1, 'Price is required')
    .refine((value) => !Number.isNaN(Number(value)) && Number(value) >= 0, 'Enter a valid non-negative price'),
  description: z.string().trim().max(1000),
  displayOrder: z
    .string()
    .trim()
    .refine((value) => Number.isInteger(Number(value)) && Number(value) >= 0, {
      message: 'Enter a whole number, 0 or greater',
    }),
});

export type AddonFormValues = z.infer<typeof addonFormSchema>;
