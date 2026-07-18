import { Link } from 'react-router-dom';
import { FolderKanban, Plus, ShieldAlert } from 'lucide-react';

import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { DataTable } from '@/shared/components/feature/DataTable';
import { StatCard } from '@/shared/components/feature/StatCard';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { LoadingSpinner } from '@/shared/components/common/LoadingSpinner';
import { useAuthStore } from '@/shared/store/auth.store';
import { useProjects } from '@/modules/projects/api/projects.queries';
import { PROJECT_STATUS_BADGE_VARIANT, PROJECT_STATUS_LABELS } from '@/modules/projects/utils/projectStatus';
import type { ProjectStatusCode } from '@/shared/types/project.types';

const TERMINAL_STATUSES: ProjectStatusCode[] = ['completed', 'cancelled'];
const NEEDS_ATTENTION_STATUSES: ProjectStatusCode[] = ['quotation_sent', 'quotation_accepted'];

/**
 * Client dashboard home. Wired to real `GET /projects` data now that the
 * project/quotation/payment domain exists — the invoices widget from the
 * earlier mock-data phase is removed since this product has no invoices
 * entity (quotations + payments cover that role here).
 */
export function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const { data: projects, isLoading, isError, refetch } = useProjects();

  const activeProjectsCount = (projects ?? []).filter(
    (project) => !TERMINAL_STATUSES.includes(project.status_code),
  ).length;
  const needsAttention = (projects ?? []).filter((project) =>
    NEEDS_ATTENTION_STATUSES.includes(project.status_code),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back{user ? `, ${user.firstName}` : ''}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here's where things stand across your projects.
          </p>
        </div>
        <Link to="/client/dashboard/projects/new" className={buttonVariants({ size: 'lg' })}>
          <Plus className="size-4" aria-hidden="true" />
          Request a new project
        </Link>
      </div>

      {needsAttention.length > 0 && (
        <Alert
          variant="warning"
          title="Action needed"
          description={`You have ${needsAttention.length} project${needsAttention.length === 1 ? '' : 's'} waiting on your response.`}
        />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Active projects" value={String(activeProjectsCount)} icon={FolderKanban} />
        <StatCard label="Needs your attention" value={String(needsAttention.length)} icon={ShieldAlert} />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-foreground">Your projects</h2>

        {isLoading && <LoadingSpinner label="Loading your projects..." />}
        {isError && <ErrorState onRetry={() => refetch()} />}

        {!isLoading && !isError && (
          <DataTable
            columns={[
              {
                header: 'Project',
                accessor: (row) => (
                  <Link
                    to={`/client/dashboard/projects/${row.id}`}
                    className="font-medium text-foreground hover:text-primary hover:underline"
                  >
                    {row.title}
                  </Link>
                ),
              },
              {
                header: 'Status',
                accessor: (row) => (
                  <Badge variant={PROJECT_STATUS_BADGE_VARIANT[row.status_code]}>
                    {PROJECT_STATUS_LABELS[row.status_code]}
                  </Badge>
                ),
              },
              {
                header: 'Requested',
                accessor: (row) => new Date(row.created_at).toLocaleDateString(),
                className: 'text-right',
              },
            ]}
            rows={projects ?? []}
            getRowKey={(row) => row.id}
            emptyMessage="You haven't requested any projects yet."
          />
        )}
      </div>
    </div>
  );
}

export default DashboardPage;
