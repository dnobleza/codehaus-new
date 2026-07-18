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

module.exports = { createPaymentSchema, PAYMENT_METHODS };
