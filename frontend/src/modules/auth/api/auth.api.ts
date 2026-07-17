import { apiClient } from '@/shared/api/apiClient';
import type { Role } from '@/shared/constants/roles';
import type { ApiEnvelope, AuthResponseData } from '@/shared/types/auth.types';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  password: string;
  contactNo?: string;
  address?: string;
}

/**
 * The `users.role` column defaults to `'CLIENT'` (uppercase) in the backend
 * schema (see backend/docs/superpowers/specs/2026-07-16-auth-registration-login-design.md),
 * while the frontend's Role type/route guards use lowercase values. Normalize
 * once here so the rest of the app never has to think about casing.
 */
function normalizeAuthResponse(data: AuthResponseData): AuthResponseData {
  return {
    ...data,
    user: { ...data.user, role: data.user.role.toLowerCase() as Role },
  };
}

/** Raw REST calls for the auth domain. Responses are unwrapped to their `data` payload here. */
export const authApi = {
  async login(payload: LoginPayload): Promise<AuthResponseData> {
    const response = await apiClient.post<ApiEnvelope<AuthResponseData>>('/auth/login', payload);
    return normalizeAuthResponse(response.data.data);
  },

  async register(payload: RegisterPayload): Promise<AuthResponseData> {
    const response = await apiClient.post<ApiEnvelope<AuthResponseData>>(
      '/auth/register',
      payload,
    );
    return normalizeAuthResponse(response.data.data);
  },
};
