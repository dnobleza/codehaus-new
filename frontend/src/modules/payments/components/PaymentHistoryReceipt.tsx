import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPHP, toNumber } from '@/shared/utils/currency';
import type { Payment, PaymentInstallment } from '@/shared/types/payment.types';
import codehausLogo from '@/assets/codehaus-logo.svg';
import {
  getInstallmentLabel,
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_BADGE,
  PAYMENT_STATUS_LABEL,
} from '../utils/paymentPresentation';

interface PaymentHistoryReceiptProps {
  /** Newest first, as the API returns them (`ORDER BY created_at DESC`). */
  payments: Payment[] | undefined;
  installments: PaymentInstallment[] | undefined;
  /** Shown in the receipt header when the project has an accepted quotation. */
  quotationNumber?: string;
}

/**
 * Parses a DATE/timestamp string from its literal parts rather than handing it
 * to `new Date()`, which treats a bare `YYYY-MM-DD` as UTC midnight and rolls
 * back a day in any timezone behind UTC. Same guard `PaymentScheduleCard` uses.
 */
function formatPaymentDate(value: string): string {
  const [datePart] = value.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Proof-of-payment receipt: a record of money the client has actually sent,
 * one row per submitted payment.
 *
 * Deliberately distinct from `PaymentReceiptCard`, which summarizes an
 * accepted quotation — the cost breakdown and the full installment schedule.
 * That card answers "what will I owe"; this one answers "what have I paid,
 * and what's left". They live in different places for that reason: the
 * quotation breakdown in the Quotations section, this in the project's
 * Invoices tab alongside the payment form.
 *
 * Renders nothing until at least one payment exists.
 */
export function PaymentHistoryReceipt({
  payments,
  installments,
  quotationNumber,
}: PaymentHistoryReceiptProps) {
  if (!payments || payments.length === 0) return null;

  const installmentBySequence = new Map(
    (installments ?? []).map((installment) => [installment.id, installment.sequence]),
  );

  /**
   * Only `verified` payments count. A payment sitting in `verification` is
   * money the client has sent but the team hasn't confirmed — showing it as
   * paid would overstate progress, and a `rejected` one was never valid.
   */
  const amountPaid = payments
    .filter((payment) => payment.status === 'verified')
    .reduce((sum, payment) => sum + toNumber(payment.amount), 0);

  /** Balance comes from the schedule, not from payments — it's the source of truth for what's owed. */
  const balanceDue = (installments ?? [])
    .filter((installment) => installment.status === 'pending')
    .reduce((sum, installment) => sum + toNumber(installment.amount), 0);

  function installmentLabelFor(payment: Payment): string | null {
    if (!payment.installment_id) return null;
    const sequence = installmentBySequence.get(payment.installment_id);
    return sequence === undefined ? null : getInstallmentLabel(sequence);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={codehausLogo} alt="CodeHaus" className="h-8 w-auto" />
            <CardTitle>Payment Receipt</CardTitle>
          </div>
          {quotationNumber && (
            <span className="text-sm font-medium text-muted-foreground">{quotationNumber}</span>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Desktop/tablet: table (design-system.md §2.4). */}
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">Payments submitted for this project</caption>
            <thead>
              <tr className="h-10 border-b border-border text-left">
                <th scope="col" className="px-2 text-xs font-semibold text-muted-foreground">
                  Date
                </th>
                <th scope="col" className="px-2 text-xs font-semibold text-muted-foreground">
                  For
                </th>
                <th scope="col" className="px-2 text-xs font-semibold text-muted-foreground">
                  Method
                </th>
                <th scope="col" className="px-2 text-xs font-semibold text-muted-foreground">
                  Reference
                </th>
                <th scope="col" className="px-2 text-xs font-semibold text-muted-foreground">
                  Amount
                </th>
                <th scope="col" className="px-2 text-xs font-semibold text-muted-foreground">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="h-11 border-b border-border last:border-0">
                  <td className="px-2 text-foreground">{formatPaymentDate(payment.created_at)}</td>
                  <td className="px-2 font-medium text-foreground">
                    {installmentLabelFor(payment) ?? '—'}
                  </td>
                  <td className="px-2 text-foreground">
                    {PAYMENT_METHOD_LABEL[payment.payment_method]}
                  </td>
                  <td className="px-2 text-foreground">{payment.reference_number ?? '—'}</td>
                  <td className="px-2 font-medium text-foreground">{formatPHP(payment.amount)}</td>
                  <td className="px-2">
                    <Badge variant={PAYMENT_STATUS_BADGE[payment.status]}>
                      {PAYMENT_STATUS_LABEL[payment.status]}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile: stacked card-per-row (design-system.md §4 table responsive rule). */}
        <ul className="flex flex-col gap-2 sm:hidden">
          {payments.map((payment) => (
            <li key={payment.id} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground">
                  {installmentLabelFor(payment) ?? formatPaymentDate(payment.created_at)}
                </span>
                <Badge variant={PAYMENT_STATUS_BADGE[payment.status]}>
                  {PAYMENT_STATUS_LABEL[payment.status]}
                </Badge>
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-y-1 text-sm">
                <dt className="text-xs text-muted-foreground">Date</dt>
                <dd className="text-right font-medium text-foreground">
                  {formatPaymentDate(payment.created_at)}
                </dd>
                <dt className="text-xs text-muted-foreground">Method</dt>
                <dd className="text-right font-medium text-foreground">
                  {PAYMENT_METHOD_LABEL[payment.payment_method]}
                </dd>
                <dt className="text-xs text-muted-foreground">Reference</dt>
                <dd className="text-right font-medium text-foreground">
                  {payment.reference_number ?? '—'}
                </dd>
                <dt className="text-xs text-muted-foreground">Amount</dt>
                <dd className="text-right font-medium text-foreground">
                  {formatPHP(payment.amount)}
                </dd>
              </dl>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">
          Amount paid <span className="font-semibold text-foreground">{formatPHP(amountPaid)}</span>
        </span>
        {balanceDue > 0 && (
          <span className="text-muted-foreground">
            Balance due{' '}
            <span className="font-semibold text-foreground">{formatPHP(balanceDue)}</span>
          </span>
        )}
      </CardFooter>
    </Card>
  );
}
