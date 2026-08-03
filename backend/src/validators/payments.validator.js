const { z } = require('zod');
const xss = require('xss');

function sanitizedString(min, max) {
  return z
    .string()
    .trim()
    .transform((val) => xss(val))
    .pipe(z.string().min(min).max(max));
}

const PAYMENT_METHODS = ['bank_transfer', 'gcash', 'maya'];

// multipart/form-data fields always arrive as strings, hence z.coerce.number().
const createPaymentSchema = z.object({
  paymentMethod: z.enum(PAYMENT_METHODS),
  amount: z.coerce.number().positive(),
  referenceNumber: sanitizedString(1, 100).optional(),
});

// An admin rejecting a payment must say why -- the client is being told to
// resubmit and needs to know what to fix. Mirrors adminDeclineSchema in
// projects.validator.js (same 1-5000 sanitized range) so the two "explain the
// refusal" flows in this product validate identically.
const adminRejectPaymentSchema = z.object({
  reason: sanitizedString(1, 5000),
});

module.exports = { createPaymentSchema, adminRejectPaymentSchema, PAYMENT_METHODS };
