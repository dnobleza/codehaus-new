import { useState } from 'react';
import { MoreHorizontal, Pencil, Plus, Power, PowerOff, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import type { ApiError } from '@/shared/api/apiClient';
import type { Addon, AddonCategory } from '@/shared/types/addon.types';
import { AddonFormDialog } from '../components/AddonFormDialog';
import { useAdminAddons, useDeleteAddon, useSetAddonActive } from '../api/addons.queries';

const CATEGORY_LABELS: Record<AddonCategory, string> = {
  authentication: 'Authentication',
  dashboard: 'Dashboard',
  payments: 'Payments',
  reports: 'Reports',
  communication: 'Communication',
  integrations: 'Integrations',
};

/** Admin add-on catalog CRUD — simpler mirror of `AdminPackagesPage`, form kept as a Modal (§2.6). */
export function AdminAddonsPage() {
  const { data: addons, isLoading, isError, refetch } = useAdminAddons();
  const deleteAddon = useDeleteAddon();
  const setActive = useSetAddonActive();

  const [formOpen, setFormOpen] = useState(false);
  const [editingAddon, setEditingAddon] = useState<Addon | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Addon | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  function openCreateForm() {
    setEditingAddon(null);
    setFormOpen(true);
  }

  function openEditForm(addon: Addon) {
    setEditingAddon(addon);
    setFormOpen(true);
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    try {
      await deleteAddon.mutateAsync(pendingDelete.id);
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
          <h1 className="text-2xl font-bold text-foreground">Add-ons</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage the optional feature catalog offered alongside packages.
          </p>
        </div>
        <Button size="lg" onClick={openCreateForm}>
          <Plus className="size-4" aria-hidden="true" />
          Create add-on
        </Button>
      </div>

      {rowError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive">
          {rowError}
        </div>
      )}

      {isLoading && <LoadingSpinner label="Loading add-ons..." />}
      {isError && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !isError && (
        <DataTable
          columns={[
            {
              header: 'Name',
              accessor: (row) => (
                <button
                  type="button"
                  onClick={() => openEditForm(row)}
                  className="font-medium text-foreground hover:text-primary hover:underline"
                >
                  {row.name}
                </button>
              ),
            },
            { header: 'Category', accessor: (row) => CATEGORY_LABELS[row.category] },
            { header: 'Price', accessor: (row) => formatPHP(row.price) },
            { header: 'Order', accessor: (row) => row.display_order },
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
              accessor: (row) => (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    aria-label={`Actions for ${row.name}`}
                    render={<Button variant="ghost" size="icon-sm" />}
                  >
                    <MoreHorizontal className="size-4" aria-hidden="true" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem icon={<Pencil />} onClick={() => openEditForm(row)}>
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      icon={row.is_active ? <PowerOff /> : <Power />}
                      disabled={setActive.isPending}
                      onClick={() => setActive.mutate({ id: row.id, isActive: !row.is_active })}
                    >
                      {row.is_active ? 'Deactivate' : 'Activate'}
                    </DropdownMenuItem>
                    <DropdownMenuItem icon={<Trash2 />} variant="destructive" onClick={() => setPendingDelete(row)}>
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ),
            },
          ]}
          rows={addons ?? []}
          getRowKey={(row) => row.id}
          emptyMessage="No add-ons yet. Create your first one."
        />
      )}

      <AddonFormDialog open={formOpen} onOpenChange={setFormOpen} addon={editingAddon} />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title={`Delete "${pendingDelete?.name}"?`}
        description="This cannot be undone."
        isConfirming={deleteAddon.isPending}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

export default AdminAddonsPage;
