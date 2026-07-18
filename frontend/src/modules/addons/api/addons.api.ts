import { apiClient } from '@/shared/api/apiClient';
import type { ApiEnvelope } from '@/shared/types/api.types';
import type { Addon, AddonCategory } from '@/shared/types/addon.types';

/**
 * camelCase body, matching `backend/src/validators/addons.validator.js`'s
 * `createAddonSchema`/`updateAddonSchema` exactly (verified against
 * `adminAddons.controller.js`).
 */
export interface AdminAddonPayload {
  category: AddonCategory;
  name: string;
  price: number;
  description?: string;
  displayOrder?: number;
}

/**
 * Admin-scoped add-on catalog CRUD (`/admin/addons`, role ADMIN only per
 * `adminAddons.route.js`). Promoted to its own module (rather than living
 * alongside `modules/packages/api/addons.api.ts`'s read-only catalog fetch)
 * per that file's own doc comment: the read-only client catalog fetch has
 * no independent screen, but a full create/edit/deactivate admin UI is
 * exactly the kind of second, real use case that earns add-ons a module of
 * their own. The shared `Addon` type is reused unchanged — no fork.
 */
export const adminAddonsApi = {
  async list(): Promise<Addon[]> {
    const response = await apiClient.get<ApiEnvelope<Addon[]>>('/admin/addons');
    return response.data.data;
  },

  async create(payload: AdminAddonPayload): Promise<Addon> {
    const response = await apiClient.post<ApiEnvelope<Addon>>('/admin/addons', payload);
    return response.data.data;
  },

  async update(id: string, payload: Partial<AdminAddonPayload>): Promise<Addon> {
    const response = await apiClient.patch<ApiEnvelope<Addon>>(`/admin/addons/${id}`, payload);
    return response.data.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/admin/addons/${id}`);
  },

  async activate(id: string): Promise<Addon> {
    const response = await apiClient.patch<ApiEnvelope<Addon>>(`/admin/addons/${id}/activate`);
    return response.data.data;
  },

  async deactivate(id: string): Promise<Addon> {
    const response = await apiClient.patch<ApiEnvelope<Addon>>(`/admin/addons/${id}/deactivate`);
    return response.data.data;
  },
};
