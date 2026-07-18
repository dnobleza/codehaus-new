import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MoreHorizontal, Pencil, Plus, Power, PowerOff, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataTable } from '@/shared/components/feature/DataTable';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { LoadingSpinner } from '@/shared/components/common/LoadingSpinner';
import { ConfirmDialog } from '@/shared/components/common/ConfirmDialog';
import { formatPHP } from '@/shared/utils/currency';
import { formatTimelineRange } from '@/shared/utils/timeline';
import type { Package } from '@/shared/types/package.types';
import type { ApiError } from '@/shared/api/apiClient';
import {
  useAdminPackages,
  useDeletePackage,
  useSetPackageActive,
} from '../api/packages.queries';

/**
 * Admin package catalog table (design-system.md §3.4's clients/invoices
 * table-first pattern: toolbar + Table Card, no separate filter row since
 * the admin list is small enough to scan in full — active AND inactive
 * both shown, unlike the client-facing catalog which is active-only).
 */
export function AdminPackagesPage() {
  const { data: packages, isLoading, isError, refetch } = useAdminPackages();
  const deletePackage = useDeletePackage();
  const [pendingDelete, setPendingDelete] = useState<Package | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    try {
      await deletePackage.mutateAsync(pendingDelete.id);
      setPendingDelete(null);
    } catch (error) {
      setRowError((error as ApiError).message);
      setPendingDelete(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Packages</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage project packages available to clients. Only active packages appear in the client portal.
          </p>
        </div>
        <Link to="/admin/dashboard/packages/new" className={buttonVariants({ size: 'lg' })}>
          <Plus className="size-4" aria-hidden="true" />
          Create package
        </Link>
      </div>

      {rowError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive">
          {rowError}
        </div>
      )}

      {isLoading && <LoadingSpinner label="Loading packages..." />}
      {isError && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !isError && (
        <DataTable
          columns={[
            {
              header: 'Package',
              accessor: (row) => (
                <Link
                  to={`/admin/dashboard/packages/${row.id}/edit`}
                  className="font-medium text-foreground hover:text-primary hover:underline"
                >
                  {row.name}
                </Link>
              ),
            },
            {
              header: 'Price',
              accessor: (row) => (row.is_custom ? 'Custom' : formatPHP(row.base_price)),
            },
            {
              header: 'Timeline',
              accessor: (row) =>
                formatTimelineRange(row.estimated_timeline_min_days, row.estimated_timeline_max_days) ?? '—',
            },
            {
              header: 'Order',
              accessor: (row) => row.display_order,
            },
            {
              header: 'Status',
              accessor: (row) => (
                <Badge variant={row.is_active ? 'success' : 'neutral'}>
                  {row.is_active ? 'Active' : 'Inactive'}
                </Badge>
              ),
            },
            {
              header: 'Actions',
              className: 'text-right',
              accessor: (row) => <PackageRowActions pkg={row} onRequestDelete={() => setPendingDelete(row)} />,
            },
          ]}
          rows={packages ?? []}
          getRowKey={(row) => row.id}
          emptyMessage="No packages yet. Create your first one to make it available to clients."
        />
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title={`Delete "${pendingDelete?.name}"?`}
        description="This cannot be undone. Packages referenced by existing projects or quotations can't be deleted — deactivate them instead."
        isConfirming={deletePackage.isPending}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

/** Row actions consolidated behind a single Dropdown trigger (design-system.md §2.8), replacing three separate always-visible icon buttons. */
function PackageRowActions({ pkg, onRequestDelete }: { pkg: Package; onRequestDelete: () => void }) {
  const navigate = useNavigate();
  const setActive = useSetPackageActive(pkg.id);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Actions for ${pkg.name}`}
        render={<Button variant="ghost" size="icon-sm" />}
      >
        <MoreHorizontal className="size-4" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem icon={<Pencil />} onClick={() => navigate(`/admin/dashboard/packages/${pkg.id}/edit`)}>
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          icon={pkg.is_active ? <PowerOff /> : <Power />}
          disabled={setActive.isPending}
          onClick={() => setActive.mutate(!pkg.is_active)}
        >
          {pkg.is_active ? 'Deactivate' : 'Activate'}
        </DropdownMenuItem>
        <DropdownMenuItem icon={<Trash2 />} variant="destructive" onClick={onRequestDelete}>
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default AdminPackagesPage;
