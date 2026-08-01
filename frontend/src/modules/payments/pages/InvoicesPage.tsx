import { Receipt } from 'lucide-react';

import { EmptyState } from '@/shared/components/common/EmptyState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { LoadingSpinner } from '@/shared/components/common/LoadingSpinner';
import { useMyInvoices } from '../api/payments.queries';
import { PaymentHistoryReceipt } from '../components/PaymentHistoryReceipt';

/**
 * Client's Invoices section: a payment receipt per project, newest-active
 * project first, covering every payment they have made across all projects.
 *
 * The API already groups payments by project and computes each project's
 * amount paid and balance due (`payments.service.js#listInvoicesForClient`),
 * so this page is a thin render over that shape — no client-side grouping or
 * money arithmetic, which keeps the "only verified payments count" rule in
 * exactly one place.
 */
export function InvoicesPage() {
  const { data: invoices, isLoading, isError, refetch } = useMyInvoices();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Invoices</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every payment you've made to CodeHaus, with what's been verified and what's still
          outstanding.
        </p>
      </div>

      {isLoading && <LoadingSpinner label="Loading your invoices..." />}

      {isError && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !isError && invoices && invoices.length === 0 && (
        <EmptyState
          icon={Receipt}
          title="No payments yet"
          description="Once you accept a quotation and submit your first payment, your receipts will appear here."
        />
      )}

      {!isLoading &&
        !isError &&
        invoices?.map((invoice) => (
          <PaymentHistoryReceipt key={invoice.project_id} invoice={invoice} />
        ))}
    </div>
  );
}

export default InvoicesPage;
