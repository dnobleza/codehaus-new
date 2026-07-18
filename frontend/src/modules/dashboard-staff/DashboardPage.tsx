import { Link } from 'react-router-dom';
import { FolderKanban, LifeBuoy, Receipt } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { ActivityFeed } from '@/shared/components/feature/ActivityFeed';
import { DataTable } from '@/shared/components/feature/DataTable';
import { StatCard } from '@/shared/components/feature/StatCard';
import { useAuthStore } from '@/shared/store/auth.store';
import { PROJECT_STATUS_VARIANT } from '@/shared/utils/statusVariant';
import { useAdminProjects } from '@/modules/projects/api/projects.queries';
import { useAdminPayments } from '@/modules/payments/api/payments.queries';
import { MOCK_STAFF_ACTIVITY, MOCK_STAFF_PROJECTS } from './mockData';

/**
 * Staff dashboard home — a reasonable extension of the design doc's
 * dashboard-admin IA (§3.2), scoped to the signed-in staff member's own
 * assigned work rather than the full cross-client view admins see. Static
 * mock data only — no network calls.
 */
export function DashboardPage() {
  const user = useAuthStore((state) => state.user);

  // Staff share the same admin/staff-scoped endpoints (task brief: staff
  // gets the same project queue + payment verification access as admin),
  // so these two counts are real; "tasks due this week"/tickets stay mock.
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
          Here's what's assigned to you this week.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link to="/staff/dashboard/projects" className="block">
          <StatCard label="Projects awaiting review" value={String(pendingReviewCount)} icon={FolderKanban} />
        </Link>
        <Link to="/staff/dashboard/payments" className="block">
          <StatCard
            label="Awaiting payment verification"
            value={String(awaitingVerificationCount)}
            icon={Receipt}
          />
        </Link>
        <StatCard label="Open tickets assigned" value="2" icon={LifeBuoy} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <h2 className="mb-3 text-lg font-semibold text-foreground">Assigned projects</h2>
          <DataTable
            columns={[
              { header: 'Project', accessor: (row) => row.name },
              { header: 'Client', accessor: (row) => row.client },
              {
                header: 'Status',
                accessor: (row) => (
                  <Badge variant={PROJECT_STATUS_VARIANT[row.status] ?? 'neutral'}>
                    {row.status}
                  </Badge>
                ),
              },
              { header: 'Due date', accessor: (row) => row.dueDate, className: 'text-right' },
            ]}
            rows={MOCK_STAFF_PROJECTS}
            getRowKey={(row) => row.id}
          />
        </div>
        <div className="lg:col-span-4">
          <h2 className="mb-3 text-lg font-semibold text-foreground">Recent activity</h2>
          <ActivityFeed title="Your recent activity" entries={MOCK_STAFF_ACTIVITY} />
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
