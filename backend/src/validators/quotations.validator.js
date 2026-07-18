const { z } = require('zod');
const { uuidSchema } = require('./common.validator');

// Client-triggered quotation request: package defaults to the project's own
// package_id if omitted (resolved in the service layer); clients can never
// set a discount.
const clientCreateQuotationSchema = z.object({
  packageId: uuidSchema.optional(),
  addonIds: z.array(uuidSchema).max(50).default([]),
});

// Admin/staff quotation create/edit. NOTE: this is intentionally a full-
// replace ("PUT-like") body, not a merge-patch, for BOTH the "create and
// send" endpoint and the "edit draft" endpoint -- `addonIds` already has to
// be the complete desired add-on set (the service clears and re-inserts
// quotation_addons every time, since a quotation's total is recomputed
// wholesale, not incrementally), so requiring `discountAmount` too (default
// 0 when omitted) keeps the whole request body consistent: submit the full
// desired quotation configuration, not a delta. Documented here because it's
// the same class of ambiguity the `.partial()`-with-`.default()` bug in
// packages.validator.js turned out to be a real footgun for -- this one is
// an intentional design choice, not an accident.
const adminQuotationSchema = z.object({
  packageId: uuidSchema.nullable().optional(),
  addonIds: z.array(uuidSchema).max(50).default([]),
  discountAmount: z.coerce.number().nonnegative().default(0),
});

module.exports = { clientCreateQuotationSchema, adminQuotationSchema };
