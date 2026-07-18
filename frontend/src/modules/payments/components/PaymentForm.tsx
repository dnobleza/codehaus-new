import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { ApiError } from '@/shared/api/apiClient';
import type { PaymentInstallment } from '@/shared/types/payment.types';
import { formatPHP, toNumber } from '@/shared/utils/currency';
import { useSubmitPayment } from '../api/payments.queries';
import { PAYMENT_METHOD_OPTIONS, paymentFormSchema, type PaymentFormValues } from '../schemas';

interface PaymentFormProps {
  projectId: string;
  /**
   * The next pending installment this submission targets. The backend
   * resolves "the next pending installment" server-side and rejects any
   * submitted amount that doesn't match it exactly, so the amount field is
   * always derived from this installment (never freely entered).
   */
  installment: PaymentInstallment;
  onSubmitted?: () => void;
}

/**
 * Parses a DATE-only string (e.g. "2026-07-18", no time component) from its
 * literal year/month/day parts rather than handing the bare string to
 * `new Date()` directly — same technique as
 * `PaymentScheduleCard.tsx`'s `parseDateOnly`, kept local here since this
 * component only needs it for the due-date header line.
 */
function parseDateOnly(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDueDate(dateStr: string): string {
  return parseDateOnly(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Payment method selection + proof-of-payment upload (Client Workflow steps
 * 9-10). Real validation per the brief: required file, required payment
 * method, positive amount. The amount is fixed to the targeted installment
 * — the backend rejects any amount that doesn't match the next pending
 * installment exactly, so the field is read-only rather than freely
 * editable.
 */
export function PaymentForm({ projectId, installment, onSubmitted }: PaymentFormProps) {
  const submitPayment = useSubmitPayment(projectId);
  const installmentAmount = toNumber(installment.amount);

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      paymentMethod: undefined,
      amount: installmentAmount > 0 ? String(installmentAmount) : '',
      referenceNumber: '',
    },
  });

  function onSubmit(values: PaymentFormValues) {
    submitPayment.mutate(
      {
        paymentMethod: values.paymentMethod,
        amount: Number(values.amount),
        referenceNumber: values.referenceNumber || undefined,
        proof: values.proof,
      },
      { onSuccess: () => onSubmitted?.() },
    );
  }

  const apiError = submitPayment.error as ApiError | null;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Installment {installment.sequence} — {toNumber(installment.percentage)}% — due{' '}
        {formatDueDate(installment.due_date)}
      </p>

      {apiError && (
        <Alert variant="danger" title="Couldn't submit your payment" description={apiError.message} />
      )}

      <Controller
        control={control}
        name="paymentMethod"
        render={({ field }) => (
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-foreground">Payment method</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {PAYMENT_METHOD_OPTIONS.map((option) => {
                const inputId = `payment-method-${option.value}`;
                const isChecked = field.value === option.value;
                return (
                  <label
                    key={option.value}
                    htmlFor={inputId}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
                      isChecked ? 'border-primary bg-primary/5 text-primary' : 'border-input hover:bg-muted',
                    )}
                  >
                    <input
                      id={inputId}
                      type="radio"
                      name={field.name}
                      value={option.value}
                      checked={isChecked}
                      onChange={() => field.onChange(option.value)}
                      onBlur={field.onBlur}
                      className="size-4 shrink-0 text-primary focus-visible:ring-3 focus-visible:ring-ring/50"
                    />
                    <span className="font-medium">{option.label}</span>
                  </label>
                );
              })}
            </div>
            {errors.paymentMethod && (
              <p className="mt-1 text-xs text-destructive">{errors.paymentMethod.message}</p>
            )}
          </fieldset>
        )}
      />

      <Input
        label={`Amount to pay (Installment ${installment.sequence} of 5 — fixed)`}
        type="text"
        inputMode="decimal"
        readOnly
        helperText={`${formatPHP(installment.amount)} — this amount is set by your payment schedule and can't be edited.`}
        error={errors.amount?.message}
        {...register('amount')}
      />

      <Input
        label="Reference number (optional)"
        helperText="e.g. your GCash/Maya reference number or bank transfer receipt no."
        error={errors.referenceNumber?.message}
        {...register('referenceNumber')}
      />

      <Controller
        control={control}
        name="proof"
        render={({ field: { onChange, onBlur, name, ref } }) => (
          <div className="flex w-full flex-col gap-1">
            <label htmlFor="proof-of-payment" className="text-sm font-medium text-foreground">
              Proof of payment
            </label>
            <input
              id="proof-of-payment"
              name={name}
              ref={ref}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
              onBlur={onBlur}
              onChange={(event) => onChange(event.target.files?.[0])}
              aria-invalid={Boolean(errors.proof) || undefined}
              aria-describedby={errors.proof ? 'proof-of-payment-error' : 'proof-of-payment-helper'}
              className="text-sm text-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/80"
            />
            {errors.proof ? (
              <p id="proof-of-payment-error" className="text-xs text-destructive">
                {errors.proof.message}
              </p>
            ) : (
              <p id="proof-of-payment-helper" className="text-xs text-muted-foreground">
                Screenshot or receipt (JPG, PNG, WEBP, GIF or PDF, up to 5MB).
              </p>
            )}
          </div>
        )}
      />

      <Button type="submit" size="lg" disabled={submitPayment.isPending}>
        {submitPayment.isPending ? 'Submitting...' : 'Submit payment'}
      </Button>
    </form>
  );
}
