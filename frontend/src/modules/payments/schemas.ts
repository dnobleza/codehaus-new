import { z } from 'zod';

import { formatPHP } from '@/shared/utils/currency';
import {
  MAX_WITHHOLDING_SHORTFALL_RATE,
  checkAmountAgainstInstallment,
} from './utils/withholdingTax';

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
const amountField = z
  .string()
  .trim()
  .min(1, 'Amount is required')
  .refine((value) => !Number.isNaN(Number(value)), 'Enter a valid amount')
  .refine((value) => Number(value) > 0, 'Amount must be greater than zero');

const paymentFormFields = {
  paymentMethod: z.enum(['bank_transfer', 'gcash', 'maya'], {
    message: 'Select a payment method',
  }),
  amount: amountField,
  referenceNumber: z.string().trim().max(100).optional().or(z.literal('')),
  proof: z
    .instanceof(File, { message: 'Proof of payment is required' })
    .refine((file) => file.size > 0, 'Proof of payment is required')
    .refine((file) => file.size <= MAX_PROOF_FILE_SIZE, 'File must be 5MB or smaller'),
};

export const paymentFormSchema = z.object(paymentFormFields);

export type PaymentFormValues = z.infer<typeof paymentFormSchema>;

/**
 * `paymentFormSchema` plus the amount rules that depend on WHICH installment
 * is being paid, which a static schema can't express.
 *
 * A factory because the due amount is per-render data (the next pending
 * installment), not a constant. The base schema stays exported and unchanged
 * for anything that only needs the field-shape rules.
 *
 * The bound is applied to the `amount` FIELD rather than as a `superRefine` on
 * the whole object, and that distinction matters: Zod skips object-level
 * refinements entirely when any field fails, so an out-of-range amount would
 * stay silent until the client had also picked a method and attached a proof
 * file — i.e. exactly when it's most annoying to discover. Field-level rules
 * report immediately, alongside the other field errors.
 *
 * The rules mirror `backend/src/services/payments.service.js#createPayment`:
 * an amount at or below the installment total is accepted if the gap is within
 * the withholding-tax tolerance; anything above is refused, and anything
 * further below is refused. The server re-checks all of it — this exists so
 * the client finds out before uploading a file.
 */
export function createPaymentFormSchema(dueAmount: string | number) {
  const tolerancePercent = Math.round(MAX_WITHHOLDING_SHORTFALL_RATE * 100);

  return z.object({
    ...paymentFormFields,
    amount: amountField.superRefine((value, ctx) => {
      const outcome = checkAmountAgainstInstallment(value, dueAmount);
      if (outcome === 'ok') return;

      const message =
        outcome === 'overpaid'
          ? `Amount can't be more than the ${formatPHP(dueAmount)} due for this installment.`
          : outcome === 'underpaid'
            ? `Amount is more than ${tolerancePercent}% below the ${formatPHP(dueAmount)} due. Pay the full amount, or the net after withholding tax.`
            : 'Enter a valid amount';

      ctx.addIssue({ code: 'custom', message });
    }),
  });
}
