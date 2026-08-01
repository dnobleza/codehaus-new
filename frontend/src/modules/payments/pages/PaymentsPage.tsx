import { CheckCircle2 } from 'lucide-react';

import { Alert } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/shared/components/common/EmptyState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { LoadingSpinner } from '@/shared/components/common/LoadingSpinner';
import { formatPHP } from '@/shared/utils/currency';
import type { DuePayment } from '@/shared/types/payment.types';
import { useDuePayments } from '../api/payments.queries';
import { PaymentForm } from '../components/PaymentForm';
import { getInstallmentLabel } from '../utils/paymentPresentation';

/**
 * Parses a DATE-only string from its literal parts rather than handing it to
 * `new Date()`, which reads a bare `YYYY-MM-DD` as UTC midnight and rolls back
 * a day in any timezone behind UTC.
 */
function formatDueDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** One project's outstanding installment: the amount owed plus the form to pay it. */
function DuePaymentCard({ due }: { due: DuePayment }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <CardTitle>{due.project_title}</CardTitle>
          <span className="text-sm font-semibold text-foreground">
            {formatPHP(due.installment.amount)}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {getInstallmentLabel(due.installment.sequence)} · due{' '}
          {formatDueDate(due.installment.due_date)}
        </p>
      </CardHeader>
      <CardContent>
        {due.awaiting_verification ? (
          // Server-resolved: a previous submission on this project is still
          // being checked, so a second one would be rejected anyway.
          <Alert
            variant="warning"
            title="Payment under verification"
            description="We've received your last payment for this project and are verifying it. You'll be able to pay the next installment once it clears."
          />
        ) : (
          <PaymentForm
            key={due.installment.id}
            projectId={due.project_id}
            installment={due.installment}
          />
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Client's Payments section: everything they currently owe across all
 * projects, each with its own payment form.
 *
 * The form used to live inside a single project's Invoices tab, which meant
 * paying two projects took two navigations and the client had no one place to
 * see what was due. Which installment a submission settles, and whether the
 * project is blocked awaiting verification, are both resolved server-side
 * (`GET /payments/due`) rather than recomputed here.
 */
export function PaymentsPage() {
  const { data: due, isLoading, isError, refetch } = useDuePayments();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Payments</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything you currently owe, across every project. Submit a payment and upload your proof
          here.
        </p>
      </div>

      {isLoading && <LoadingSpinner label="Loading your payments..." />}

      {isError && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !isError && due && due.length === 0 && (
        <EmptyState
          icon={CheckCircle2}
          title="Nothing due right now"
          description="You have no outstanding installments. Receipts for payments you've already made are in the Invoices section."
        />
      )}

      {!isLoading &&
        !isError &&
        due?.map((entry) => <DuePaymentCard key={entry.project_id} due={entry} />)}
    </div>
  );
}

export default PaymentsPage;
