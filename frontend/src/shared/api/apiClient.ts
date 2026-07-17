import axios, { type AxiosError } from 'axios';
import { env } from '@/shared/config/env';
import { useAuthStore } from '@/shared/store/auth.store';

export interface ApiError {
  status: number;
  message: string;
  fieldErrors?: Record<string, string>;
}

/**
 * Shared axios instance. `baseURL` and `withCredentials` are configured once
 * here so the backend's httpOnly refresh cookie is sent/received on every
 * request (architecture doc §7 "Authentication Flow & Token Management").
 */
export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ success: boolean; message?: string }>) => {
    const status = error.response?.status ?? 0;
    const message =
      error.response?.data?.message ??
      error.message ??
      'Something went wrong. Please try again.';

    const normalized: ApiError = { status, message };
    return Promise.reject(normalized);
  },
);
