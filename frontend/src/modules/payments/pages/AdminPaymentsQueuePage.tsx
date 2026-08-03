import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
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
import { formatPHP, toNumber } from '@/shared/utils/currency';
import { useCan } from '@/shared/auth/useCan';
import type { ApiError } from '@/shared/api/apiClient';
import type { Payment, PaymentStatus } from '@/shared/types/payment.types';
import { paymentClientName, projectLabel } from '@/shared/utils/people';
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
  const canVerify = useCan('payment.verify');
  const canReject = useCan('payment.reject');
  const canViewProof = useCan('payment.viewProof');
  const canAction = canVerify && canReject;

  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('verification');
  const filters = statusFilter === 'all' ? undefined : { status: statusFilter };

  const { data: payments, isLoading, isError, refetch } = useAdminPayments(filters);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const verifyPayment = useVerifyPayment(selectedPayment?.project_id);
  const rejectPayment = useRejectPayment(selectedPayment?.project_id);
  const actionError = (verifyPayment.error ?? rejectPayment.error) as ApiError | null;

  const sortedPayments = useMemo(
    () => [...(payments ?? [])].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)),
    [payments],
  );

  function handleVerify() {
    if (!selectedPayment) return;
    verifyPayment.mutate(selectedPayment.id, { onSuccess: closeDrawer });
  }

  function closeDrawer() {
    setSelectedPayment(null);
    setShowRejectForm(false);
    setRejectReason('');
  }

  // Two-step, exactly like the project decline flow in AdminProjectDetailPage:
  // "Reject" reveals a required reason field rather than rejecting outright.
  // The reason is what the client reads to learn what to fix, so it can't be
  // an afterthought the admin is allowed to skip.
  function handleReject() {
    if (!selectedPayment || rejectReason.trim().length === 0) return;
    rejectPayment.mutate(
      { id: selectedPayment.id, reason: rejectReason.trim() },
      { onSuccess: closeDrawer },
    );
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
            { header: 'Project', accessor: (row) => projectLabel(row) },
            // Whose money this is. Verifying a payment is an attestation that
            // funds landed; doing that against a bare UUID is guesswork.
            { header: 'Client', accessor: (row) => paymentClientName(row) },
            {
              header: 'Installment',
              accessor: (row) => (row.installment_sequence ? `${row.installment_sequence} of 5` : '—'),
            },
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

      <Sheet open={Boolean(selectedPayment)} onOpenChange={(open) => !open && closeDrawer()}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Payment detail</SheetTitle>
          </SheetHeader>
          {selectedPayment && (
            <>
              <SheetBody>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <dt className="text-muted-foreground">Project</dt>
                  <dd className="text-right font-medium text-foreground">
                    {selectedPayment.project_id}
                  </dd>
                  <dt className="text-muted-foreground">Amount</dt>
                  <dd className="text-right font-medium text-foreground">
                    {formatPHP(selectedPayment.amount)}
                  </dd>
                  {/* Only shown when non-zero: for the exact-amount majority
                      this row would be noise on every single review. When it
                      IS shown, the admin is checking a bank slip that reads
                      less than the installment and needs to know that gap was
                      accepted deliberately as withheld tax, not underpaid. */}
                  {toNumber(selectedPayment.shortfall_amount) > 0 && (
                    <>
                      <dt className="text-muted-foreground">Withheld / short by</dt>
                      <dd className="text-right font-medium text-warning-foreground-on-light">
                        {formatPHP(selectedPayment.shortfall_amount)}
                      </dd>
                    </>
                  )}
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
                    <Badge variant={STATUS_BADGE[selectedPayment.status]}>
                      {selectedPayment.status}
                    </Badge>
                  </dd>
                </dl>
                {/* An already-rejected payment shows the reason the client was
                    given, so a second reviewer sees the history rather than
                    re-deriving it. */}
                {selectedPayment.status === 'rejected' && selectedPayment.rejection_reason && (
                  <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                    <p className="text-sm font-medium text-foreground">Reason given to the client</p>
                    <p className="mt-1 text-sm whitespace-pre-line text-muted-foreground">
                      {selectedPayment.rejection_reason}
                    </p>
                  </div>
                )}
                {canViewProof && (
                  <PaymentProofPreview proofUrl={selectedPayment.proof_of_payment_url} />
                )}
                {showRejectForm && (
                  <div className="mt-4 flex flex-col gap-2">
                    <Textarea
                      label="Reason for rejecting"
                      value={rejectReason}
                      onChange={(event) => setRejectReason(event.target.value)}
                      placeholder="Tell the client exactly what to fix, e.g. the screenshot is unreadable, or the reference number doesn't match."
                      disabled={rejectPayment.isPending}
                    />
                    <p className="text-xs text-muted-foreground">
                      The client sees this message, so be specific about what to correct.
                    </p>
                  </div>
                )}
              </SheetBody>
              {selectedPayment.status === 'verification' && canAction && (
                <SheetFooter>
                  {actionError && (
                    <p className="mr-auto text-sm text-destructive">{actionError.message}</p>
                  )}
                  {showRejectForm ? (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowRejectForm(false);
                          setRejectReason('');
                        }}
                        disabled={rejectPayment.isPending}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleReject}
                        disabled={rejectPayment.isPending || rejectReason.trim().length === 0}
                      >
                        {rejectPayment.isPending ? 'Rejecting...' : 'Confirm rejection'}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => setShowRejectForm(true)}
                        disabled={verifyPayment.isPending}
                      >
                        Reject
                      </Button>
                      <Button onClick={handleVerify} disabled={verifyPayment.isPending}>
                        {verifyPayment.isPending ? 'Verifying...' : 'Verify payment'}
                      </Button>
                    </>
                  )}
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
