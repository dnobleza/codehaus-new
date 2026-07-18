import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/shared/components/feature/DataTable';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { LoadingSpinner } from '@/shared/components/common/LoadingSpinner';
import { useProjects } from '../api/projects.queries';
import { PROJECT_STATUS_BADGE_VARIANT, PROJECT_STATUS_LABELS } from '../utils/projectStatus';

/** Client's own project list (design-system.md §3.8 table-first pattern). */
export function ProjectsListPage() {
  const { data: projects, isLoading, isError, refetch } = useProjects();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track the status of everything you've requested from CodeHaus.
          </p>
        </div>
        <Link to="/client/dashboard/projects/new" className={buttonVariants({ size: 'lg' })}>
          <Plus className="size-4" aria-hidden="true" />
          Request a new project
        </Link>
      </div>

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
  );
}

export default ProjectsListPage;
