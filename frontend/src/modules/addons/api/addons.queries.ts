import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/shared/api/queryKeys';
import { adminAddonsApi, type AdminAddonPayload } from './addons.api';

/**
 * All add-ons (active + inactive) — admin catalog table.
 *
 * `enabled` defaults to `true`; pass `false` for sessions that can't reach
 * `/admin/addons` (ADMIN only per `adminAddons.route.js` — STAFF gets a
 * 403). See `useAdminPackages`'s doc comment in
 * `modules/packages/api/packages.queries.ts` for the same pattern and the
 * concrete STAFF-blocked case it exists for.
 */
export function useAdminAddons(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.addons.adminList(),
    queryFn: adminAddonsApi.list,
    enabled: options?.enabled ?? true,
  });
}

function invalidateAddonCaches(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: queryKeys.addons.adminList() });
  // Also invalidate the client-facing catalog read (`modules/packages/api/addons.queries.ts`'s
  // `useAddons`) so a newly created/deactivated add-on reflects immediately there too.
  queryClient.invalidateQueries({ queryKey: queryKeys.addons.list() });
}

export function useCreateAddon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AdminAddonPayload) => adminAddonsApi.create(payload),
    onSuccess: () => invalidateAddonCaches(queryClient),
  });
}

export function useUpdateAddon(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<AdminAddonPayload>) => adminAddonsApi.update(id, payload),
    onSuccess: () => invalidateAddonCaches(queryClient),
  });
}

export function useDeleteAddon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminAddonsApi.remove(id),
    onSuccess: () => invalidateAddonCaches(queryClient),
  });
}

export function useSetAddonActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      isActive ? adminAddonsApi.activate(id) : adminAddonsApi.deactivate(id),
    onSuccess: () => invalidateAddonCaches(queryClient),
  });
}
