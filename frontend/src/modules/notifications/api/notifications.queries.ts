import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/shared/api/queryKeys';
import { notificationsApi } from './notifications.api';

/**
 * The caller's notification inbox plus its unread count.
 *
 * Polls every 60s so a notification raised by an admin action (a quotation
 * sent, a payment verified) reaches the client without a reload. Deliberately
 * slower than the 8s polling used on payment/project detail views: those are
 * watching a specific action the user just took and is waiting on, whereas the
 * bell is ambient — a minute of latency is unnoticeable and it costs one cheap
 * indexed query per client per minute rather than seven.
 */
export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications.list(),
    queryFn: () => notificationsApi.list(),
    refetchInterval: 60_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}
