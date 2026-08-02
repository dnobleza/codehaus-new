import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FileWarning, FolderKanban, Receipt, Wallet } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/shared/components/feature/DataTable';
import { StatCard } from '@/shared/components/feature/StatCard';
import { EmptyState } from '@/shared/components/common/EmptyState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { LoadingSpinner } from '@/shared/components/common/LoadingSpinner';
import { useAuthStore } from '@/shared/store/auth.store';
import { formatPHP, toNumber } from '@/shared/utils/currency';
import { projectLabel } from '@/shared/utils/people';
import { useAdminProjects } from '@/modules/projects/api/projects.queries';
import { useAdminPayments } from '@/modules/payments/api/payments.queries';

const PAYMENT_STATUS_BADGE: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  pending: 'neutral',
  verification: 'warning',
  verified: 'success',
  rejected: 'danger',
};

const RECENT_PAYMENTS_LIMIT = 8;

/**
 * Admin dashboard home — real API data only, all money in PHP. Answers "is
 * money and new business flowing?": new requests awaiting a decision,
 * payments awaiting verification, quotations sent with no client response
 * yet (a real revenue-leak signal nothing else in the product surfaces),
 * and cash actually collected.
 *
 * "Quotations sent with no client response" is read directly off
 * `status_code === 'quotation_sent'` on the admin project list — that
 * status is set exactly when a quotation is sent and cleared the moment the
 * client accepts or rejects it (see `modules/projects/utils/projectStatus.ts`'s
 * status table), so it doesn't require a new endpoint.
 *
 * OMITTED, for lack of a real endpoint:
 * - "Overdue installments": `PaymentInstallment.due_date` only exists
 *   nested inside a single project's detail response
 *   (`GET /admin/projects/:id`) — there is no cross-project installment
 *   listing endpoint, so computing this here would require an N+1 fetch
 *   over every project. Needs a backend aggregate (e.g.
 *   `GET /admin/payments/installments?overdue=true`) before this can be a
 *   real panel.
 * - "Recent activity" / "Upcoming tasks": no cross-project activity feed
 *   endpoint for admin exists (`ProjectActivityItem` is scoped per-project,
 *   client-only, via `GET /projects/:id/activity`).
 * - "Open support tickets": no support-ticket entity exists in this API.
 */
export function DashboardPage() {
  const user = useAuthStore((state) => state.user);

  const {
    data: projects,
    isLoading: projectsLoading,
    isError: projectsError,
    refetch: refetchProjects,
  } = useAdminProjects();
  const {
    data: payments,
    isLoading: paymentsLoading,
    isError: paymentsError,
    refetch: refetchPayments,
  } = useAdminPayments();

  const isLoading = projectsLoading || paymentsLoading;
  const isError = projectsError || paymentsError;

  const newRequestsCount = (projects ?? []).filter(
    (project) => project.status_code === 'submitted',
  ).length;
  const quotationsAwaitingResponseCount = (projects ?? []).filter(
    (project) => project.status_code === 'quotation_sent',
  ).length;
  const awaitingVerificationCount = (payments ?? []).filter(
    (payment) => payment.status === 'verification',
  ).length;
  const cashCollected = (payments ?? [])
    .filter((payment) => payment.status === 'verified')
    .reduce((sum, payment) => sum + toNumber(payment.amount), 0);

  const recentPayments = useMemo(
    () =>
      [...(payments ?? [])]
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
        .slice(0, RECENT_PAYMENTS_LIMIT),
    [payments],
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back{user ? `, ${user.firstName}` : ''}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Is money and new business flowing across all clients and projects.
        </p>
      </div>

      {isLoading && <LoadingSpinner label="Loading dashboard..." />}
      {isError && (
        <ErrorState
          onRetry={() => {
            refetchProjects();
            refetchPayments();
          }}
        />
      )}

      {!isLoading && !isError && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link to="/admin/dashboard/projects" className="block">
              <StatCard
                label="New requests awaiting review"
                value={String(newRequestsCount)}
                icon={FolderKanban}
              />
            </Link>
            <Link to="/admin/dashboard/projects" className="block">
              <StatCard
                label="Quotations sent, no response"
                value={String(quotationsAwaitingResponseCount)}
                icon={FileWarning}
              />
            </Link>
            <Link to="/admin/dashboard/payments" className="block">
              <StatCard
                label="Awaiting payment verification"
                value={String(awaitingVerificationCount)}
                icon={Receipt}
              />
            </Link>
            <StatCard label="Cash collected" value={formatPHP(cashCollected)} icon={Wallet} />
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">Recent payments</h2>
            {recentPayments.length === 0 ? (
              <EmptyState icon={Receipt} title="No payments yet" />
            ) : (
              <DataTable
                columns={[
                  { header: 'Project', accessor: (row) => projectLabel(row) },
                  { header: 'Amount', accessor: (row) => formatPHP(row.amount) },
                  { header: 'Method', accessor: (row) => row.payment_method },
                  {
                    header: 'Status',
                    accessor: (row) => (
                      <Badge variant={PAYMENT_STATUS_BADGE[row.status]}>{row.status}</Badge>
                    ),
                  },
                  {
                    header: 'Submitted',
                    accessor: (row) => new Date(row.created_at).toLocaleDateString(),
                    className: 'text-right',
                  },
                ]}
                rows={recentPayments}
                getRowKey={(row) => row.id}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default DashboardPage;
