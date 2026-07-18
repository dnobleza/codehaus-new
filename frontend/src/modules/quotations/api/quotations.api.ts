import { apiClient } from '@/shared/api/apiClient';
import type { ApiEnvelope } from '@/shared/types/api.types';
import type { Quotation } from '@/shared/types/quotation.types';

/**
 * camelCase body, matching
 * `backend/src/validators/quotations.validator.js`'s `clientCreateQuotationSchema`
 * exactly (verified against the live API). `packageId` is optional — the
 * server defaults to the project's own `package_id` when omitted, and
 * rejects the request with a 400 if the project is a custom request
 * (`package_id` is null) and no `packageId` is supplied here either.
 */
export interface CreateQuotationPayload {
  packageId?: string;
  addonIds: string[];
}

/**
 * Raw REST calls for the quotation domain. Quotations have no standalone
 * `GET /quotations/:id` in this API — they're always read nested inside
 * their parent `Project` (see `modules/projects/api/projects.api.ts`), so
 * this module only exposes the write actions.
 */
export const quotationsApi = {
  /** Client-triggered: persists the selected package + add-ons as a `draft` quotation request. */
  async create(projectId: string, payload: CreateQuotationPayload): Promise<Quotation> {
    const response = await apiClient.post<ApiEnvelope<Quotation>>(
      `/projects/${projectId}/quotations`,
      payload,
    );
    return response.data.data;
  },

  /** Only meaningful once the quotation's status is `sent`. */
  async accept(projectId: string, quotationId: string): Promise<Quotation> {
    const response = await apiClient.patch<ApiEnvelope<Quotation>>(
      `/projects/${projectId}/quotations/${quotationId}/accept`,
    );
    return response.data.data;
  },

  async reject(projectId: string, quotationId: string): Promise<Quotation> {
    const response = await apiClient.patch<ApiEnvelope<Quotation>>(
      `/projects/${projectId}/quotations/${quotationId}/reject`,
    );
    return response.data.data;
  },
};

/**
 * camelCase body, matching `backend/src/validators/quotations.validator.js`'s
 * `adminQuotationSchema` exactly (verified against
 * `adminProjects.controller.js`). This is a full-replace body for BOTH
 * "create and send" and "edit draft" — `addonIds` must be the complete
 * desired add-on set every time (the service clears and re-inserts
 * `quotation_addons` wholesale), and `discountAmount` defaults to 0 when
 * omitted but is always accepted as part of the same full snapshot,
 * per the validator's own doc comment.
 */
export interface AdminQuotationPayload {
  packageId?: string | null;
  addonIds: string[];
  discountAmount?: number;
}

/**
 * Admin/staff-scoped quotation create/edit/send
 * (`/admin/projects/:id/quotations...`, role ADMIN or STAFF per
 * `adminProjects.route.js`). Quotations remain read only nested inside
 * their parent `Project` (see `quotationsApi`'s doc comment above) — none
 * of these three responses include the `addons` line-item breakdown
 * either (verified against `quotations.service.js`: all three return the
 * raw `quotations` row via `insert`/`updateCore`/`setStatus`), so callers
 * invalidate the parent project's admin detail query rather than trusting
 * the mutation response directly, exactly like the client-facing
 * `useCreateQuotation` already does.
 */
export const adminQuotationsApi = {
  /** Creates a brand-new quotation and sends it immediately (status `sent`). Never mutates a prior draft. */
  async createAndSend(projectId: string, payload: AdminQuotationPayload): Promise<Quotation> {
    const response = await apiClient.post<ApiEnvelope<Quotation>>(
      `/admin/projects/${projectId}/quotations`,
      payload,
    );
    return response.data.data;
  },

  /** Only valid while the target quotation is still `draft`. */
  async editDraft(projectId: string, quotationId: string, payload: AdminQuotationPayload): Promise<Quotation> {
    const response = await apiClient.patch<ApiEnvelope<Quotation>>(
      `/admin/projects/${projectId}/quotations/${quotationId}`,
      payload,
    );
    return response.data.data;
  },

  /** Moves an edited (or client-submitted) draft to `sent`. */
  async sendDraft(projectId: string, quotationId: string): Promise<Quotation> {
    const response = await apiClient.patch<ApiEnvelope<Quotation>>(
      `/admin/projects/${projectId}/quotations/${quotationId}/send`,
    );
    return response.data.data;
  },
};
