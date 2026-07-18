import { AlertTriangle, CheckCircle2, Clock, type LucideIcon } from 'lucide-react';

import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPHP, toNumber } from '@/shared/utils/currency';
import type { PaymentInstallment } from '@/shared/types/payment.types';

interface PaymentScheduleCardProps {
  installments: PaymentInstallment[] | undefined;
}

/**
 * Sequence 1 is always the 50% downpayment; sequences 2-5 are the
 * 20%/10%/10%/10% weekly installments that follow (see the fixed schedule
 * defined in `backend/docs/superpowers/specs/2026-07-17-package-quotation-schema-design.md`).
 * Labeling by literal sequence number (not hardcoding a count of 5) keeps
 * this correct even if the schedule shape ever changes server-side.
 */
function getInstallmentLabel(sequence: number): string {
  return sequence === 1 ? 'Downpayment' : `Installment ${sequence}`;
}

/**
 * Parses a DATE-only string (e.g. "2026-07-18", no time component) from its
 * literal year/month/day parts rather than handing the bare string to
 * `new Date()` directly. `new Date("2026-07-18")` parses as UTC midnight,
 * which rolls back to the previous day once rendered in any timezone behind
 * UTC (e.g. `toLocaleDateString()` in a US timezone) — constructing the
 * `Date` from local components instead sidesteps that off-by-one entirely.
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

/** Only a still-pending installment can be overdue; paid ones never are. */
function isOverdue(installment: PaymentInstallment): boolean {
  if (installment.status !== 'pending') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return parseDateOnly(installment.due_date) < today;
}

interface StatusPresentation {
  variant: BadgeProps['variant'];
  label: string;
  Icon: LucideIcon;
}

/**
 * Status is always conveyed by an icon + text label together (never color
 * alone), per design-system.md §5's accessibility rule for status Badges.
 */
function getStatusPresentation(installment: PaymentInstallment): StatusPresentation {
  if (installment.status === 'paid') {
    return { variant: 'success', label: 'Paid', Icon: CheckCircle2 };
  }
  if (isOverdue(installment)) {
    return { variant: 'danger', label: 'Overdue', Icon: AlertTriangle };
  }
  return { variant: 'neutral', label: 'Pending', Icon: Clock };
}

/**
 * Read-only breakdown of a project's fixed 5-installment payment schedule
 * (50% downpayment, then 20%, then 10% x 3, weekly due dates). Shared
 * between the client and admin project detail pages — deliberately has no
 * role-specific actions or copy, only display. Renders nothing before a
 * quotation has been accepted (no installments exist yet).
 */
export function PaymentScheduleCard({ installments }: PaymentScheduleCardProps) {
  if (!installments || installments.length === 0) return null;

  const paidCount = installments.filter((installment) => installment.status === 'paid').length;
  const remainingBalance = installments
    .filter((installment) => installment.status === 'pending')
    .reduce((sum, installment) => sum + toNumber(installment.amount), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Schedule</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Desktop/tablet: standard table (design-system.md §2.4). */}
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">Payment installment schedule</caption>
            <thead>
              <tr className="h-10 border-b border-border text-left">
                <th scope="col" className="px-2 text-xs font-semibold text-muted-foreground">
                  Installment
                </th>
                <th scope="col" className="px-2 text-xs font-semibold text-muted-foreground">
                  Percentage
                </th>
                <th scope="col" className="px-2 text-xs font-semibold text-muted-foreground">
                  Amount
                </th>
                <th scope="col" className="px-2 text-xs font-semibold text-muted-foreground">
                  Due date
                </th>
                <th scope="col" className="px-2 text-xs font-semibold text-muted-foreground">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {installments.map((installment) => {
                const { variant, label, Icon } = getStatusPresentation(installment);
                return (
                  <tr key={installment.id} className="h-11 border-b border-border last:border-0">
                    <td className="px-2 font-medium text-foreground">
                      {getInstallmentLabel(installment.sequence)}
                    </td>
                    <td className="px-2 text-foreground">{toNumber(installment.percentage)}%</td>
                    <td className="px-2 text-foreground">{formatPHP(installment.amount)}</td>
                    <td className="px-2 text-foreground">{formatDueDate(installment.due_date)}</td>
                    <td className="px-2">
                      <Badge variant={variant}>
                        <Icon className="size-3" aria-hidden="true" />
                        {label}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile: stacked card-per-row (design-system.md §4 Table responsive rule). */}
        <ul className="flex flex-col gap-2 sm:hidden">
          {installments.map((installment) => {
            const { variant, label, Icon } = getStatusPresentation(installment);
            return (
              <li key={installment.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {getInstallmentLabel(installment.sequence)}
                  </span>
                  <Badge variant={variant}>
                    <Icon className="size-3" aria-hidden="true" />
                    {label}
                  </Badge>
                </div>
                <dl className="mt-2 grid grid-cols-2 gap-y-1 text-sm">
                  <dt className="text-xs text-muted-foreground">Percentage</dt>
                  <dd className="text-right font-medium text-foreground">
                    {toNumber(installment.percentage)}%
                  </dd>
                  <dt className="text-xs text-muted-foreground">Amount</dt>
                  <dd className="text-right font-medium text-foreground">
                    {formatPHP(installment.amount)}
                  </dd>
                  <dt className="text-xs text-muted-foreground">Due date</dt>
                  <dd className="text-right font-medium text-foreground">
                    {formatDueDate(installment.due_date)}
                  </dd>
                </dl>
              </li>
            );
          })}
        </ul>
      </CardContent>
      <CardFooter className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-medium text-foreground">
          {paidCount} of {installments.length} paid
        </span>
        {remainingBalance > 0 && (
          <span className="text-muted-foreground">
            Remaining balance:{' '}
            <span className="font-semibold text-foreground">{formatPHP(remainingBalance)}</span>
          </span>
        )}
      </CardFooter>
    </Card>
  );
}
