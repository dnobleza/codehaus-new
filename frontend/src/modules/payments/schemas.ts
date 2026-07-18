import { z } from 'zod';

export const PAYMENT_METHOD_OPTIONS = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'gcash', label: 'GCash' },
  { value: 'maya', label: 'Maya' },
] as const;

const MAX_PROOF_FILE_SIZE = 5 * 1024 * 1024; // 5MB, matches backend/src/middleware/upload.middleware.js

// Mirrors backend/src/validators/payments.validator.js's createPaymentSchema
// (paymentMethod/amount/referenceNumber), plus the required-file rule the
// backend enforces separately in payments.controller.js (`if (!req.file)`).
//
// `amount` is kept as a `string` in the form schema (not `z.coerce.number`)
// deliberately: a native `<input type="number">` round-trips through
// react-hook-form as a string, and `z.coerce.number()`'s differing
// input/output types make `useForm`'s generics and `zodResolver` disagree
// (a known react-hook-form + Zod v4 coercion friction point). Converted to
// a real number only at submission time, right before calling the API.
export const paymentFormSchema = z.object({
  paymentMethod: z.enum(['bank_transfer', 'gcash', 'maya'], {
    message: 'Select a payment method',
  }),
  amount: z
    .string()
    .trim()
    .min(1, 'Amount is required')
    .refine((value) => !Number.isNaN(Number(value)), 'Enter a valid amount')
    .refine((value) => Number(value) > 0, 'Amount must be greater than zero'),
  referenceNumber: z.string().trim().max(100).optional().or(z.literal('')),
  proof: z
    .instanceof(File, { message: 'Proof of payment is required' })
    .refine((file) => file.size > 0, 'Proof of payment is required')
    .refine((file) => file.size <= MAX_PROOF_FILE_SIZE, 'File must be 5MB or smaller'),
});

export type PaymentFormValues = z.infer<typeof paymentFormSchema>;
