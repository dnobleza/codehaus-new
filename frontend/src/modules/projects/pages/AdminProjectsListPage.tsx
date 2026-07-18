import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { DataTable } from '@/shared/components/feature/DataTable';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { LoadingSpinner } from '@/shared/components/common/LoadingSpinner';
import type { ProjectStatusCode } from '@/shared/types/project.types';
import { useAdminPackages } from '@/modules/packages/api/packages.queries';
import { useAdminProjects } from '../api/projects.queries';
import { PROJECT_STATUS_BADGE_VARIANT, PROJECT_STATUS_LABELS } from '../utils/projectStatus';

const STATUS_FILTER_OPTIONS: { value: ProjectStatusCode | 'all'; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  ...(Object.keys(PROJECT_STATUS_LABELS) as ProjectStatusCode[]).map((status) => ({
    value: status,
    label: PROJECT_STATUS_LABELS[status],
  })),
];

/**
 * Admin/staff project queue — a status filter Dropdown (not free-text),
 * table columns per the task brief: client, package, status Badge,
 * submitted date, row action to open detail. Mounted at both
 * `/admin/dashboard/projects` and `/staff/dashboard/projects` (same
 * component, both roles are permitted on `GET /admin/projects` per
 * `adminProjects.route.js`) — `useLocation` derives the correct detail link
 * prefix so one component serves both routes without a prop.
 *
 * KNOWN GAP (see report): `GET /admin/projects` returns bare `projects`
 * rows with no client name joined in (verified against
 * `projects.repository.js#listAll` — plain `SELECT * FROM projects`, and
 * there is no `/admin/clients` or user-lookup endpoint anywhere in this
 * API). The "Client" column below can only show the raw `client_id` as a
 * result; a real client name requires a backend addition.
 */
export function AdminProjectsListPage() {
  const location = useLocation();
  const basePath = location.pathname.startsWith('/staff') ? '/staff/dashboard' : '/admin/dashboard';

  const [statusFilter, setStatusFilter] = useState<ProjectStatusCode | 'all'>('all');
  const filters = statusFilter === 'all' ? undefined : { statusCode: statusFilter };

  const { data: projects, isLoading, isError, refetch } = useAdminProjects(filters);
  const { data: packages } = useAdminPackages();

  const packageNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const pkg of packages ?? []) map.set(pkg.id, pkg.name);
    return map;
  }, [packages]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Projects</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review client requests, prepare quotations, and track delivery status.
        </p>
      </div>

      <div className="max-w-xs">
        <Select
          label="Filter by status"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as ProjectStatusCode | 'all')}
        >
          {STATUS_FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      {isLoading && <LoadingSpinner label="Loading projects..." />}
      {isError && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !isError && (
        <DataTable
          columns={[
            {
              header: 'Project',
              accessor: (row) => (
                <Link
                  to={`${basePath}/projects/${row.id}`}
                  className="font-medium text-foreground hover:text-primary hover:underline"
                >
                  {row.title}
                </Link>
              ),
            },
            {
              header: 'Client',
              accessor: (row) => `Client #${row.client_id}`,
            },
            {
              header: 'Package',
              accessor: (row) => (row.package_id ? packageNameById.get(String(row.package_id)) ?? '—' : 'Custom'),
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
              header: 'Submitted',
              accessor: (row) => new Date(row.created_at).toLocaleDateString(),
              className: 'text-right',
            },
          ]}
          rows={projects ?? []}
          getRowKey={(row) => row.id}
          emptyMessage="No projects match this filter."
        />
      )}
    </div>
  );
}

export default AdminProjectsListPage;
