import { z } from 'zod';

/**
 * Mirrors `backend/src/validators/packages.validator.js`'s
 * `createPackageSchema`/`updatePackageSchema` plus the two table-level CHECK
 * constraints in `backend/db/migrations/005_create_project_packages.sql`
 * (`project_packages_price_required_unless_custom`,
 * `project_packages_timeline_order`) — enforced here client-side too so the
 * admin gets an inline field error instead of a 400/23514 round-trip.
 *
 * Timeline is authored in weeks in the form (matching how every other
 * screen in the app displays it, via `formatTimelineRange`'s "1 week = 7
 * days" convention) and converted to days at submission time.
 */
export const packageFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(120),
    slug: z.string().trim().max(140).optional().or(z.literal('')),
    description: z.string().trim().max(2000),
    isCustom: z.boolean(),
    basePrice: z
      .string()
      .trim()
      .optional()
      .or(z.literal(''))
      .refine((value) => !value || (!Number.isNaN(Number(value)) && Number(value) >= 0), {
        message: 'Enter a valid non-negative price',
      }),
    timelineMinWeeks: z
      .string()
      .trim()
      .optional()
      .or(z.literal(''))
      .refine((value) => !value || (Number.isInteger(Number(value)) && Number(value) >= 0), {
        message: 'Enter a whole number of weeks',
      }),
    timelineMaxWeeks: z
      .string()
      .trim()
      .optional()
      .or(z.literal(''))
      .refine((value) => !value || (Number.isInteger(Number(value)) && Number(value) >= 0), {
        message: 'Enter a whole number of weeks',
      }),
    displayOrder: z
      .string()
      .trim()
      .refine((value) => Number.isInteger(Number(value)) && Number(value) >= 0, {
        message: 'Enter a whole number, 0 or greater',
      }),
  })
  .refine((data) => data.isCustom || (data.basePrice && Number(data.basePrice) >= 0), {
    message: 'Base price is required unless this is the custom project package',
    path: ['basePrice'],
  })
  .refine(
    (data) =>
      !data.timelineMinWeeks ||
      !data.timelineMaxWeeks ||
      Number(data.timelineMaxWeeks) >= Number(data.timelineMinWeeks),
    { message: 'Max timeline must be greater than or equal to min timeline', path: ['timelineMaxWeeks'] },
  );

export type PackageFormValues = z.infer<typeof packageFormSchema>;

export const packageListItemSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(160),
});

export type PackageListItemValues = z.infer<typeof packageListItemSchema>;
