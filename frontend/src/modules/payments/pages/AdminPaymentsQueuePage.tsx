import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { DataTable } from '@/shared/components/feature/DataTable';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { LoadingSpinner } from '@/shared/components/common/LoadingSpinner';
import { formatPHP } from '@/shared/utils/currency';
import type { ApiError } from '@/shared/api/apiClient';
import type { Payment, PaymentStatus } from '@/shared/types/payment.types';
import { PaymentProofPreview } from '../components/PaymentProofPreview';
import { useAdminPayments, useRejectPayment, useVerifyPayment } from '../api/payments.queries';

const STATUS_FILTER_OPTIONS: { value: PaymentStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'verification', label: 'Awaiting verification' },
  { value: 'verified', label: 'Verified' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'pending', label: 'Pending' },
];

const STATUS_BADGE: Record<PaymentStatus, 'neutral' | 'warning' | 'success' | 'danger'> = {
  pending: 'neutral',
  verification: 'warning',
  verified: 'success',
  rejected: 'danger',
};

/**
 * Payment verification queue (task brief step 11), a dedicated page rather
 * than folding it only into project detail — per the brief's own reasoning,
 * an admin working through a backlog benefits from a queue view instead of
 * needing to know which project to open first. Row detail opens as a
 * Drawer (design-system.md §3.2's "table rows open a Drawer with record
 * detail rather than a full page navigation, to keep the admin in
 * dashboard context").
 */
export function AdminPaymentsQueuePage() {
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('verification');
  const filters = statusFilter === 'all' ? undefined : { status: statusFilter };

  const { data: payments, isLoading, isError, refetch } = useAdminPayments(filters);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  const verifyPayment = useVerifyPayment(selectedPayment?.project_id);
  const rejectPayment = useRejectPayment(selectedPayment?.project_id);
  const actionError = (verifyPayment.error ?? rejectPayment.error) as ApiError | null;

  const sortedPayments = useMemo(
    () => [...(payments ?? [])].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)),
    [payments],
  );

  function handleVerify() {
    if (!selectedPayment) return;
    verifyPayment.mutate(selectedPayment.id, { onSuccess: () => setSelectedPayment(null) });
  }

  function handleReject() {
    if (!selectedPayment) return;
    rejectPayment.mutate(selectedPayment.id, { onSuccess: () => setSelectedPayment(null) });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Payment verification</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review submitted proof of payment and verify or reject each submission.
        </p>
      </div>

      <div className="max-w-xs">
        <Select
          label="Filter by status"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as PaymentStatus | 'all')}
        >
          {STATUS_FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      {isLoading && <LoadingSpinner label="Loading payments..." />}
      {isError && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !isError && (
        <DataTable
          columns={[
            { header: 'Project', accessor: (row) => row.project_id },
            { header: 'Method', accessor: (row) => row.payment_method },
            { header: 'Amount', accessor: (row) => formatPHP(row.amount) },
            { header: 'Reference', accessor: (row) => row.reference_number ?? '—' },
            {
              header: 'Status',
              accessor: (row) => <Badge variant={STATUS_BADGE[row.status]}>{row.status}</Badge>,
            },
            {
              header: 'Submitted',
              accessor: (row) => new Date(row.created_at).toLocaleDateString(),
              className: 'text-right',
            },
            {
              header: '',
              className: 'text-right',
              accessor: (row) => (
                <Button variant="outline" size="sm" onClick={() => setSelectedPayment(row)}>
                  Review
                </Button>
              ),
            },
          ]}
          rows={sortedPayments}
          getRowKey={(row) => row.id}
          emptyMessage="No payments match this filter."
        />
      )}

      <Sheet open={Boolean(selectedPayment)} onOpenChange={(open) => !open && setSelectedPayment(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Payment detail</SheetTitle>
          </SheetHeader>
          {selectedPayment && (
            <>
              <SheetBody>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <dt className="text-muted-foreground">Project</dt>
                  <dd className="text-right font-medium text-foreground">{selectedPayment.project_id}</dd>
                  <dt className="text-muted-foreground">Amount</dt>
                  <dd className="text-right font-medium text-foreground">{formatPHP(selectedPayment.amount)}</dd>
                  <dt className="text-muted-foreground">Method</dt>
                  <dd className="text-right font-medium text-foreground uppercase">
                    {selectedPayment.payment_method}
                  </dd>
                  <dt className="text-muted-foreground">Reference number</dt>
                  <dd className="text-right font-medium text-foreground">
                    {selectedPayment.reference_number ?? '—'}
                  </dd>
                  <dt className="text-muted-foreground">Status</dt>
                  <dd className="text-right">
                    <Badge variant={STATUS_BADGE[selectedPayment.status]}>{selectedPayment.status}</Badge>
                  </dd>
                </dl>
                <PaymentProofPreview proofUrl={selectedPayment.proof_of_payment_url} />
              </SheetBody>
              {selectedPayment.status === 'verification' && (
                <SheetFooter>
                  {actionError && <p className="mr-auto text-sm text-destructive">{actionError.message}</p>}
                  <Button
                    variant="outline"
                    onClick={handleReject}
                    disabled={verifyPayment.isPending || rejectPayment.isPending}
                  >
                    Reject
                  </Button>
                  <Button onClick={handleVerify} disabled={verifyPayment.isPending || rejectPayment.isPending}>
                    {verifyPayment.isPending ? 'Verifying...' : 'Verify payment'}
                  </Button>
                </SheetFooter>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default AdminPaymentsQueuePage;
