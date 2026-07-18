import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/shared/api/queryKeys';
import {
  adminPackagesApi,
  packagesApi,
  type AdminPackagePayload,
  type PackagePagePayload,
} from './packages.api';

/** Active package catalog (Starter/Business/Corporate/Custom), per design-system.md §3 package browser. */
export function usePackages() {
  return useQuery({
    queryKey: queryKeys.packages.list(),
    queryFn: packagesApi.list,
  });
}

export function usePackage(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.packages.detail(id ?? ''),
    queryFn: () => packagesApi.getById(id as string),
    enabled: Boolean(id),
  });
}

// --- Admin package management (role ADMIN only) ---

/**
 * All packages (active + inactive) — admin list/table view.
 *
 * `enabled` defaults to `true` but can be turned off by callers that know
 * the current user can't reach `/admin/packages` (ADMIN only per
 * `adminPackages.route.js` — STAFF gets a 403). See
 * `modules/projects/components/AdminQuotationBuilder.tsx` for the concrete
 * case this exists for: avoids firing a request that's guaranteed to fail
 * for a STAFF-authenticated session instead of surfacing a misleading
 * generic error.
 */
export function useAdminPackages(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.packages.adminList(),
    queryFn: adminPackagesApi.list,
    enabled: options?.enabled ?? true,
  });
}

export function useAdminPackage(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.packages.adminDetail(id ?? ''),
    queryFn: () => adminPackagesApi.getById(id as string),
    enabled: Boolean(id),
  });
}

function invalidatePackageCaches(queryClient: ReturnType<typeof useQueryClient>, id?: string) {
  queryClient.invalidateQueries({ queryKey: queryKeys.packages.adminList() });
  queryClient.invalidateQueries({ queryKey: queryKeys.packages.list() });
  if (id) queryClient.invalidateQueries({ queryKey: queryKeys.packages.adminDetail(id) });
}

export function useCreatePackage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AdminPackagePayload) => adminPackagesApi.create(payload),
    onSuccess: () => invalidatePackageCaches(queryClient),
  });
}

export function useUpdatePackage(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<AdminPackagePayload>) => adminPackagesApi.update(id, payload),
    onSuccess: () => invalidatePackageCaches(queryClient, id),
  });
}

export function useDeletePackage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminPackagesApi.remove(id),
    onSuccess: () => invalidatePackageCaches(queryClient),
  });
}

export function useSetPackageActive(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (isActive: boolean) =>
      isActive ? adminPackagesApi.activate(id) : adminPackagesApi.deactivate(id),
    onSuccess: () => invalidatePackageCaches(queryClient, id),
  });
}

export function useUploadPackageThumbnail(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => adminPackagesApi.uploadThumbnail(id, file),
    onSuccess: () => invalidatePackageCaches(queryClient, id),
  });
}

export function useUploadPackageBanner(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => adminPackagesApi.uploadBanner(id, file),
    onSuccess: () => invalidatePackageCaches(queryClient, id),
  });
}

/**
 * Inline add/edit/remove for a package's included pages list ("Configure
 * Included Pages"). All three invalidate the parent package's admin detail
 * query rather than trusting the raw mutation response — see
 * `adminPackagesApi`'s doc comment on the pages/features shape mismatch.
 */
export function usePackagePageMutations(packageId: string) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.packages.adminDetail(packageId) });

  const add = useMutation({
    mutationFn: (payload: PackagePagePayload) => adminPackagesApi.addPage(packageId, payload),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (pageId: string) => adminPackagesApi.deletePage(packageId, pageId),
    onSuccess: invalidate,
  });

  return { add, remove };
}

/** Inline add/remove for a package's included features list ("Configure Included Features"). */
export function usePackageFeatureMutations(packageId: string) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.packages.adminDetail(packageId) });

  const add = useMutation({
    mutationFn: (payload: PackagePagePayload) => adminPackagesApi.addFeature(packageId, payload),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (featureId: string) => adminPackagesApi.deleteFeature(packageId, featureId),
    onSuccess: invalidate,
  });

  return { add, remove };
}
