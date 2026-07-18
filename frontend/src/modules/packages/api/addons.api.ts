import { apiClient } from '@/shared/api/apiClient';
import type { ApiEnvelope } from '@/shared/types/api.types';
import type { Addon } from '@/shared/types/addon.types';

/**
 * Raw REST call for the add-on catalog. Lives alongside `packages.api.ts`
 * rather than in its own `modules/addons/` — a borderline module-ownership
 * call (architecture doc §11 boundary rule), made because add-ons have no
 * independent screen of their own in the client app; they're only ever
 * consumed inside the quotation builder alongside the package catalog. If
 * the Admin Engineer needs a dedicated add-on management UI (create/edit/
 * deactivate), promoting this to its own module at that point is the right
 * call — this is a read-only catalog fetch, not a decision to keep them
 * permanently joined.
 */
export const addonsApi = {
  async list(): Promise<Addon[]> {
    const response = await apiClient.get<ApiEnvelope<Addon[]>>('/addons');
    return response.data.data;
  },
};
