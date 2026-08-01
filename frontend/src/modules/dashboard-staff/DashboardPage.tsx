import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Clock3, FolderKanban, UserRoundCheck } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/shared/components/feature/DataTable';
import { StatCard } from '@/shared/components/feature/StatCard';
import { EmptyState } from '@/shared/components/common/EmptyState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { LoadingSpinner } from '@/shared/components/common/LoadingSpinner';
import { useAuthStore } from '@/shared/store/auth.store';
import type { ProjectStatusCode } from '@/shared/types/project.types';
import { useAdminProjects } from '@/modules/projects/api/projects.queries';
import {
  PROJECT_STATUS_BADGE_VARIANT,
  PROJECT_STATUS_LABELS,
} from '@/modules/projects/utils/projectStatus';

// Delivery-stage grouping for the "what's in flight" panel — mirrors the
// backend's own STAFF_ASSIGNABLE_STATUSES plus the statuses that precede
// them in the forward progression, since staff can view (though not always
// set) all of these on an assigned project.
const IN_PROGRESS_STATUSES: ProjectStatusCode[] = [
  'accepted',
  'scheduled',
  'in_development',
  'in_testing',
  'client_review',
  'revision_requested',
  'revision_in_progress',
  'ready_for_deployment',
  'deployed',
];

// A project sits here specifically because the CLIENT hasn't moved it
// forward yet — not because staff or admin owe it anything. This is the
// "blocked, not on us" bucket staff needs to see at a glance.
const BLOCKED_ON_CLIENT_STATUSES: ProjectStatusCode[] = ['waiting_for_client', 'quotation_sent'];

/**
 * Staff dashboard home — real API data only. Answers "what do I need to
 * move forward today?": assigned projects grouped by delivery stage, and
 * which of those are blocked waiting on the client rather than on staff.
 *
 * `useAdminProjects()` is expected to return only this staff member's
 * assigned projects once the backend's assignment-scoping for
 * `GET /admin/projects` ships (concurrent backend work) — no client-side
 * filtering is applied here to fake that scoping in the meantime.
 *
 * OMITTED: a "milestones in progress" panel, per the task brief's ask —
 * there is no endpoint that exposes milestone data to STAFF/ADMIN today.
 * `GET /projects/:id/overview` (the only endpoint that returns milestones)
 * is hard-gated to role CLIENT (`requireRole('client')` in
 * `backend/src/routes/projects.route.js`), and milestones are not nested on
 * `GET /admin/projects` or `GET /admin/projects/:id` either (verified
 * against `projects.service.js#getProjectAdmin`, which only nests
 * `quotations` and `paymentInstallments`). Surfacing this needs a new
 * admin/staff-scoped milestones read endpoint.
 */
export function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const { data: projects, isLoading, isError, refetch } = useAdminProjects();

  const inProgressProjects = useMemo(
    () => (projects ?? []).filter((project) => IN_PROGRESS_STATUSES.includes(project.status_code)),
    [projects],
  );
  const blockedOnClientProjects = useMemo(
    () =>
      (projects ?? []).filter((project) =>
        BLOCKED_ON_CLIENT_STATUSES.includes(project.status_code),
      ),
    [projects],
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back{user ? `, ${user.firstName}` : ''}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          What needs to move forward today, across your assigned projects.
        </p>
      </div>

      {isLoading && <LoadingSpinner label="Loading your projects..." />}
      {isError && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !isError && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Link to="/staff/dashboard/projects" className="block">
              <StatCard
                label="Assigned projects in progress"
                value={String(inProgressProjects.length)}
                icon={FolderKanban}
              />
            </Link>
            <Link to="/staff/dashboard/projects" className="block">
              <StatCard
                label="Blocked waiting on client"
                value={String(blockedOnClientProjects.length)}
                icon={Clock3}
              />
            </Link>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              In progress, by delivery stage
            </h2>
            {inProgressProjects.length === 0 ? (
              <EmptyState
                icon={UserRoundCheck}
                title="Nothing in progress"
                description="Assigned projects actively being delivered will show up here."
              />
            ) : (
              <DataTable
                columns={[
                  {
                    header: 'Project',
                    accessor: (row) => (
                      <Link
                        to={`/staff/dashboard/projects/${row.id}`}
                        className="font-medium text-foreground hover:text-primary-text hover:underline"
                      >
                        {row.title}
                      </Link>
                    ),
                  },
                  {
                    header: 'Stage',
                    accessor: (row) => (
                      <Badge variant={PROJECT_STATUS_BADGE_VARIANT[row.status_code]}>
                        {PROJECT_STATUS_LABELS[row.status_code]}
                      </Badge>
                    ),
                  },
                ]}
                rows={inProgressProjects}
                getRowKey={(row) => row.id}
              />
            )}
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              Blocked waiting on client
            </h2>
            {blockedOnClientProjects.length === 0 ? (
              <EmptyState
                icon={Clock3}
                title="Nothing blocked"
                description="Projects waiting on a client response or a quotation reply will show up here."
              />
            ) : (
              <DataTable
                columns={[
                  {
                    header: 'Project',
                    accessor: (row) => (
                      <Link
                        to={`/staff/dashboard/projects/${row.id}`}
                        className="font-medium text-foreground hover:text-primary-text hover:underline"
                      >
                        {row.title}
                      </Link>
                    ),
                  },
                  {
                    header: 'Waiting on',
                    accessor: (row) => (
                      <Badge variant={PROJECT_STATUS_BADGE_VARIANT[row.status_code]}>
                        {PROJECT_STATUS_LABELS[row.status_code]}
                      </Badge>
                    ),
                  },
                ]}
                rows={blockedOnClientProjects}
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
