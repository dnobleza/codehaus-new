import { Fragment } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatPHP, toNumber } from '@/shared/utils/currency';
import type { PaymentListItem, ProjectInvoice } from '@/shared/types/payment.types';
import codehausLogo from '@/assets/codehaus-logo.svg';
import {
  getInstallmentLabel,
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_BADGE,
  PAYMENT_STATUS_LABEL,
} from '../utils/paymentPresentation';

interface PaymentHistoryReceiptProps {
  invoice: ProjectInvoice;
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

/** `null` when the payment predates the installment schedule (nullable FK). */
function installmentLabelFor(payment: PaymentListItem): string | null {
  return payment.installment_sequence === null
    ? null
    : getInstallmentLabel(payment.installment_sequence);
}

/**
 * The reason an admin gave for refusing this payment, or `null` when there is
 * nothing to show. Guards on status too: `rejection_reason` is only meaningful
 * on a `rejected` payment, and a stale reason must never surface next to a
 * payment that was later resubmitted and verified.
 */
function rejectionReasonOf(payment: PaymentListItem): string | null {
  return payment.status === 'rejected' ? (payment.rejection_reason ?? null) : null;
}

/**
 * Proof-of-payment receipt for a single project: a record of money the client
 * has actually sent, one row per submitted payment, with amount paid and
 * balance due.
 *
 * Deliberately distinct from `PaymentReceiptCard`, which summarizes an
 * accepted quotation — the cost breakdown and full installment schedule. That
 * card answers "what will I owe"; this one answers "what have I paid, and
 * what's left". The two live in different sections for that reason: the
 * quotation breakdown under Quotations, this under Invoices.
 *
 * Both totals are computed server-side (`payments.service.js`), not here —
 * `amount_paid` counts only verified payments, and `balance_due` comes from
 * the installment schedule rather than from subtracting payments.
 */
export function PaymentHistoryReceipt({ invoice }: PaymentHistoryReceiptProps) {
  if (invoice.payments.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src={codehausLogo} alt="CodeHaus" className="h-8 w-auto" />
            <CardTitle>Payment Receipt</CardTitle>
          </div>
          <span className="text-sm font-medium text-muted-foreground">{invoice.project_title}</span>
        </div>
      </CardHeader>

      <CardContent>
        {/* Desktop/tablet: table (design-system.md §2.4). */}
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">Payments submitted for {invoice.project_title}</caption>
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
              {invoice.payments.map((payment) => (
                <Fragment key={payment.id}>
                  <tr
                    className={cn(
                      'h-11 border-b border-border last:border-0',
                      // A rejected payment's reason renders in the row below, so
                      // this row keeps its border only when there is no such row.
                      rejectionReasonOf(payment) && 'border-b-0',
                    )}
                  >
                    <td className="px-2 text-foreground">{formatPaymentDate(payment.created_at)}</td>
                    <td className="px-2 font-medium text-foreground">
                      {installmentLabelFor(payment) ?? '—'}
                    </td>
                    <td className="px-2 text-foreground">
                      {PAYMENT_METHOD_LABEL[payment.payment_method]}
                    </td>
                    <td className="px-2 text-foreground">{payment.reference_number ?? '—'}</td>
                    <td className="px-2 font-medium text-foreground">
                      {formatPHP(payment.amount)}
                      {toNumber(payment.shortfall_amount) > 0 && (
                        <span className="block text-xs font-normal text-muted-foreground">
                          {formatPHP(payment.shortfall_amount)} withheld
                        </span>
                      )}
                    </td>
                    <td className="px-2">
                      <Badge variant={PAYMENT_STATUS_BADGE[payment.status]}>
                        {PAYMENT_STATUS_LABEL[payment.status]}
                      </Badge>
                    </td>
                  </tr>
                  {/* Without this the client is told to resubmit with no idea
                      what was wrong, and typically resubmits the same file. */}
                  {rejectionReasonOf(payment) && (
                    <tr className="border-b border-border last:border-0">
                      <td colSpan={6} className="px-2 pb-3">
                        <p className="text-xs whitespace-pre-line text-destructive">
                          Why this was rejected: {rejectionReasonOf(payment)}
                        </p>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile: stacked card-per-row (design-system.md §4 table responsive rule). */}
        <ul className="flex flex-col gap-2 sm:hidden">
          {invoice.payments.map((payment) => (
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
                {toNumber(payment.shortfall_amount) > 0 && (
                  <>
                    <dt className="text-xs text-muted-foreground">Withheld</dt>
                    <dd className="text-right font-medium text-foreground">
                      {formatPHP(payment.shortfall_amount)}
                    </dd>
                  </>
                )}
              </dl>
              {rejectionReasonOf(payment) && (
                <p className="mt-2 text-xs whitespace-pre-line text-destructive">
                  Why this was rejected: {rejectionReasonOf(payment)}
                </p>
              )}
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">
          Amount paid{' '}
          <span className="font-semibold text-foreground">{formatPHP(invoice.amount_paid)}</span>
        </span>
        {Number(invoice.balance_due) > 0 && (
          <span className="text-muted-foreground">
            Balance due{' '}
            <span className="font-semibold text-foreground">{formatPHP(invoice.balance_due)}</span>
          </span>
        )}
      </CardFooter>
    </Card>
  );
}
