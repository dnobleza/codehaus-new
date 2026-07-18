import { apiClient } from '@/shared/api/apiClient';
import type { ApiEnvelope } from '@/shared/types/api.types';
import type { Payment, PaymentMethod, PaymentStatus } from '@/shared/types/payment.types';

/**
 * camelCase field names, matching
 * `backend/src/validators/payments.validator.js`'s `createPaymentSchema`
 * exactly (verified against the live API — `payment_method` in the task
 * brief is actually `paymentMethod` on the wire, same for `referenceNumber`).
 */
export interface SubmitPaymentPayload {
  paymentMethod: PaymentMethod;
  amount: number;
  referenceNumber?: string;
  proof: File;
}

/** Raw REST calls for the payment domain. Responses are unwrapped to their `data` payload here. */
export const paymentsApi = {
  /** multipart/form-data — file field name is `proof` per the backend's multer config. */
  async submit(projectId: string, payload: SubmitPaymentPayload): Promise<Payment> {
    const formData = new FormData();
    formData.append('paymentMethod', payload.paymentMethod);
    formData.append('amount', String(payload.amount));
    if (payload.referenceNumber) {
      formData.append('referenceNumber', payload.referenceNumber);
    }
    formData.append('proof', payload.proof);

    const response = await apiClient.post<ApiEnvelope<Payment>>(
      `/projects/${projectId}/payments`,
      formData,
    );
    return response.data.data;
  },

  async listByProject(projectId: string): Promise<Payment[]> {
    const response = await apiClient.get<ApiEnvelope<Payment[]>>(`/projects/${projectId}/payments`);
    return response.data.data;
  },

  /**
   * Fetches the authenticated proof-of-payment file and returns a local
   * blob object URL. `proofUrl` is the root-relative authenticated path
   * already returned on the `Payment` object
   * (`/projects/{id}/payments/{id}/proof`) — a plain `<img src>` can't
   * attach the `Authorization` header this route requires, so the file has
   * to be fetched through `apiClient` and turned into an object URL
   * instead. Caller owns the returned URL and must `URL.revokeObjectURL`
   * it when done (see `useProofImageUrl`, which handles this).
   */
  async fetchProofBlobUrl(proofUrl: string): Promise<string> {
    const response = await apiClient.get<Blob>(proofUrl, { responseType: 'blob' });
    return URL.createObjectURL(response.data);
  },
};

export interface ListAdminPaymentsFilters {
  status?: PaymentStatus;
}

/**
 * Admin/staff-scoped payment verification queue (`/admin/payments`, role
 * ADMIN or STAFF per `adminPayments.route.js`). `list()` returns bare
 * `payments` rows run through the same `presentPayments` presenter the
 * client-facing list uses (verified against `adminPayments.controller.js`
 * and `paymentPresenter.js`), so `proof_of_payment_url` is already the
 * authenticated `/projects/{id}/payments/{id}/proof` path — reuse
 * `useProofImageUrl` below unchanged. Like `adminProjectsApi.list`, these
 * rows have no client name or project title joined in (verified against
 * `payments.repository.js#listAll` — plain `SELECT * FROM payments`); the
 * admin payments queue page resolves `project_id` against the admin
 * project list it already has in hand rather than a second per-row fetch.
 */
export const adminPaymentsApi = {
  async list(filters?: ListAdminPaymentsFilters): Promise<Payment[]> {
    const response = await apiClient.get<ApiEnvelope<Payment[]>>('/admin/payments', {
      params: filters?.status ? { status: filters.status } : undefined,
    });
    return response.data.data;
  },

  /** Verifying cascades the parent project's status to `accepted` server-side. */
  async verify(id: string): Promise<Payment> {
    const response = await apiClient.patch<ApiEnvelope<Payment>>(`/admin/payments/${id}/verify`);
    return response.data.data;
  },

  async reject(id: string): Promise<Payment> {
    const response = await apiClient.patch<ApiEnvelope<Payment>>(`/admin/payments/${id}/reject`);
    return response.data.data;
  },
};
