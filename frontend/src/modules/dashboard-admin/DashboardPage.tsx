import { Link } from 'react-router-dom';
import { FolderKanban, LifeBuoy, Receipt, Wallet } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { ActivityFeed } from '@/shared/components/feature/ActivityFeed';
import { DataTable } from '@/shared/components/feature/DataTable';
import { StatCard } from '@/shared/components/feature/StatCard';
import { useAuthStore } from '@/shared/store/auth.store';
import { useAdminProjects } from '@/modules/projects/api/projects.queries';
import { useAdminPayments } from '@/modules/payments/api/payments.queries';
import { MOCK_ADMIN_ACTIVITY, MOCK_ADMIN_PAYMENTS, MOCK_ADMIN_TASKS } from './mockData';

const PAYMENT_STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  Completed: 'success',
  Pending: 'warning',
  Failed: 'danger',
  Refunded: 'neutral',
};

/**
 * Admin dashboard home. Static/hardcoded mock data only — no network calls.
 * Layout follows design-system.md §3.2.
 */
export function DashboardPage() {
  const user = useAuthStore((state) => state.user);

  // Real counts wired from the admin project queue / payment verification
  // queue (task brief: "counts: pending review, awaiting payment
  // verification"); revenue/support tickets remain mock — this feature
  // doesn't provide a real revenue aggregation or support-ticket endpoint.
  const { data: projects } = useAdminProjects();
  const { data: payments } = useAdminPayments({ status: 'verification' });

  const pendingReviewCount = (projects ?? []).filter(
    (project) => project.status_code === 'submitted' || project.status_code === 'under_review',
  ).length;
  const awaitingVerificationCount = payments?.length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back{user ? `, ${user.firstName}` : ''}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Business overview across all clients and projects.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link to="/admin/dashboard/projects" className="block">
          <StatCard label="Projects awaiting review" value={String(pendingReviewCount)} icon={FolderKanban} />
        </Link>
        <Link to="/admin/dashboard/payments" className="block">
          <StatCard
            label="Awaiting payment verification"
            value={String(awaitingVerificationCount)}
            icon={Receipt}
          />
        </Link>
        <StatCard
          label="Monthly revenue"
          value="$58,900"
          icon={Wallet}
          trend={{ value: '+12%', direction: 'up' }}
        />
        <StatCard
          label="Open support tickets"
          value="7"
          icon={LifeBuoy}
          trend={{ value: '-2 today', direction: 'up' }}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <h2 className="mb-3 text-lg font-semibold text-foreground">Recent activity</h2>
          <ActivityFeed title="Across all clients" entries={MOCK_ADMIN_ACTIVITY} />
        </div>
        <div className="lg:col-span-4">
          <h2 className="mb-3 text-lg font-semibold text-foreground">Upcoming tasks</h2>
          <ActivityFeed title="Needs your attention" entries={MOCK_ADMIN_TASKS} />
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-foreground">Recent payments</h2>
        <DataTable
          columns={[
            { header: 'Client', accessor: (row) => row.client },
            { header: 'Invoice #', accessor: (row) => row.invoiceNo },
            { header: 'Amount', accessor: (row) => row.amount },
            { header: 'Method', accessor: (row) => row.method },
            {
              header: 'Status',
              accessor: (row) => (
                <Badge variant={PAYMENT_STATUS_VARIANT[row.status] ?? 'neutral'}>
                  {row.status}
                </Badge>
              ),
            },
          ]}
          rows={MOCK_ADMIN_PAYMENTS}
          getRowKey={(row) => row.id}
        />
      </div>
    </div>
  );
}

export default DashboardPage;
