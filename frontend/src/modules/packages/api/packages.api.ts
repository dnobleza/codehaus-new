import { apiClient } from '@/shared/api/apiClient';
import type { ApiEnvelope } from '@/shared/types/api.types';
import type { Package } from '@/shared/types/package.types';

/** Raw REST calls for the package catalog. Responses are unwrapped to their `data` payload here. */
export const packagesApi = {
  async list(): Promise<Package[]> {
    const response = await apiClient.get<ApiEnvelope<Package[]>>('/packages');
    return response.data.data;
  },

  async getById(id: string): Promise<Package> {
    const response = await apiClient.get<ApiEnvelope<Package>>(`/packages/${id}`);
    return response.data.data;
  },
};

/**
 * camelCase body, matching `backend/src/validators/packages.validator.js`'s
 * `createPackageSchema`/`updatePackageSchema` exactly (verified against
 * `adminPackages.controller.js`). `slug` is optional on create — the
 * backend slugifies `name` when omitted (`packages.service.js#slugify`).
 */
export interface AdminPackagePayload {
  name: string;
  slug?: string;
  description?: string | null;
  basePrice?: number | null;
  estimatedTimelineMinDays?: number | null;
  estimatedTimelineMaxDays?: number | null;
  displayOrder?: number;
  isCustom?: boolean;
}

export interface PackagePagePayload {
  name: string;
  displayOrder?: number;
}

/**
 * Admin-scoped package catalog management (`/admin/packages`, role ADMIN
 * only per `adminPackages.route.js`). Kept alongside the read-only
 * `packagesApi` above rather than a separate module — same entity, same
 * shared `Package` type, just admin-only endpoints layered on top.
 *
 * `addPage`/`updatePage`/`addFeature`/`updateFeature` deliberately do NOT
 * type their raw responses as `PackagePage`/`PackageFeature` — the backend
 * returns the raw `package_pages`/`package_features` row (`RETURNING *`,
 * snake_case `display_order`) for these four mutations, NOT the camelCase
 * shape `PACKAGE_DETAIL_QUERY` builds for a package's nested `pages`/
 * `features` arrays (verified against `packages.repository.js`). Rather
 * than introduce a second, snake_case-flavored page/feature type just to
 * describe a response nobody needs to read, every page/feature mutation
 * below returns `void` and callers invalidate the parent package's detail
 * query instead (same "invalidate then refetch" pattern already used by
 * `modules/quotations/api/quotations.queries.ts` for an analogous
 * shape mismatch).
 */
export const adminPackagesApi = {
  async list(): Promise<Package[]> {
    const response = await apiClient.get<ApiEnvelope<Package[]>>('/admin/packages');
    return response.data.data;
  },

  async getById(id: string): Promise<Package> {
    const response = await apiClient.get<ApiEnvelope<Package>>(`/admin/packages/${id}`);
    return response.data.data;
  },

  async create(payload: AdminPackagePayload): Promise<Package> {
    const response = await apiClient.post<ApiEnvelope<Package>>('/admin/packages', payload);
    return response.data.data;
  },

  async update(id: string, payload: Partial<AdminPackagePayload>): Promise<Package> {
    const response = await apiClient.patch<ApiEnvelope<Package>>(`/admin/packages/${id}`, payload);
    return response.data.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/admin/packages/${id}`);
  },

  async activate(id: string): Promise<Package> {
    const response = await apiClient.patch<ApiEnvelope<Package>>(`/admin/packages/${id}/activate`);
    return response.data.data;
  },

  async deactivate(id: string): Promise<Package> {
    const response = await apiClient.patch<ApiEnvelope<Package>>(`/admin/packages/${id}/deactivate`);
    return response.data.data;
  },

  /** multipart/form-data — file field name is `thumbnail` per the backend's multer config. */
  async uploadThumbnail(id: string, file: File): Promise<void> {
    const formData = new FormData();
    formData.append('thumbnail', file);
    await apiClient.post(`/admin/packages/${id}/thumbnail`, formData);
  },

  /** multipart/form-data — file field name is `banner` per the backend's multer config. */
  async uploadBanner(id: string, file: File): Promise<void> {
    const formData = new FormData();
    formData.append('banner', file);
    await apiClient.post(`/admin/packages/${id}/banner`, formData);
  },

  async addPage(packageId: string, payload: PackagePagePayload): Promise<void> {
    await apiClient.post(`/admin/packages/${packageId}/pages`, payload);
  },

  async updatePage(packageId: string, pageId: string, payload: Partial<PackagePagePayload>): Promise<void> {
    await apiClient.patch(`/admin/packages/${packageId}/pages/${pageId}`, payload);
  },

  async deletePage(packageId: string, pageId: string): Promise<void> {
    await apiClient.delete(`/admin/packages/${packageId}/pages/${pageId}`);
  },

  async addFeature(packageId: string, payload: PackagePagePayload): Promise<void> {
    await apiClient.post(`/admin/packages/${packageId}/features`, payload);
  },

  async updateFeature(packageId: string, featureId: string, payload: Partial<PackagePagePayload>): Promise<void> {
    await apiClient.patch(`/admin/packages/${packageId}/features/${featureId}`, payload);
  },

  async deleteFeature(packageId: string, featureId: string): Promise<void> {
    await apiClient.delete(`/admin/packages/${packageId}/features/${featureId}`);
  },
};
