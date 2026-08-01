import { apiClient } from '@/shared/api/apiClient';
import type { ApiEnvelope } from '@/shared/types/api.types';
import type { AppNotification, NotificationsResponse } from '@/shared/types/notification.types';

/**
 * Raw REST calls for the notification domain. The inbox is always the
 * CALLER's own — every route is scoped server-side to the JWT subject, so
 * none of these take a user id.
 */
export const notificationsApi = {
  /** Newest first, capped server-side. Returns the unread count alongside, so the badge needs no second request. */
  async list(): Promise<NotificationsResponse> {
    const response = await apiClient.get<ApiEnvelope<NotificationsResponse>>('/notifications');
    return response.data.data;
  },

  async markRead(id: string): Promise<AppNotification> {
    const response = await apiClient.patch<ApiEnvelope<AppNotification>>(
      `/notifications/${id}/read`,
    );
    return response.data.data;
  },

  async markAllRead(): Promise<{ count: number }> {
    const response =
      await apiClient.patch<ApiEnvelope<{ count: number }>>('/notifications/read-all');
    return response.data.data;
  },
};
