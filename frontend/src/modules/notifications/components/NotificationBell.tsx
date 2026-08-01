import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { AppNotification } from '@/shared/types/notification.types';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '../api/notifications.queries';

/**
 * Relative age ("3m", "2h", "5d") for the notification list. Kept compact
 * because it sits inline beside the title in a narrow dropdown; the full
 * timestamp is available via the `title` attribute for anyone who needs it.
 */
function formatRelativeTime(value: string): string {
  const then = new Date(value).getTime();
  const diffMinutes = Math.round((Date.now() - then) / 60_000);

  if (diffMinutes < 1) return 'now';
  if (diffMinutes < 60) return `${diffMinutes}m`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;

  return `${Math.round(diffHours / 24)}d`;
}

/**
 * Notification inbox in the dashboard topbar: a bell with an unread badge and
 * a dropdown listing recent notifications.
 *
 * Clicking one marks it read and navigates to whatever it is about (the
 * quotation, the Invoices page, the project). The destination is decided
 * server-side and stored on the row as `link` — this component never maps
 * event types to routes, so adding an event needs no change here.
 *
 * Only clients receive notifications today; staff and admin see an empty
 * inbox rather than a hidden bell, since the shell is shared and an inbox
 * that exists-but-is-empty is less confusing than chrome that appears and
 * disappears by role.
 */
export function NotificationBell() {
  const navigate = useNavigate();
  const { data } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  function handleSelect(notification: AppNotification) {
    if (!notification.read_at) {
      markRead.mutate(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        className="relative inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Bell className="size-4" aria-hidden="true" />
        {unreadCount > 0 && (
          // Count is capped so a long-idle inbox can't stretch the badge past
          // the bell. aria-hidden because the trigger's aria-label already
          // announces the exact number.
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2">
          <p className="text-sm font-semibold text-foreground">Notifications</p>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="text-xs font-medium text-primary-text hover:underline disabled:opacity-50"
            >
              Mark all read
            </button>
          )}
        </div>

        <DropdownMenuSeparator />

        {notifications.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            You're all caught up.
          </p>
        ) : (
          <ul className="max-h-96 overflow-y-auto">
            {notifications.map((notification) => (
              <li key={notification.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(notification)}
                  className={cn(
                    'flex w-full flex-col gap-0.5 border-b border-border px-3 py-2.5 text-left transition-colors last:border-0 hover:bg-muted',
                    !notification.read_at && 'bg-primary/10',
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {notification.title}
                    </span>
                    <span
                      className="shrink-0 text-xs text-muted-foreground"
                      title={new Date(notification.created_at).toLocaleString()}
                    >
                      {formatRelativeTime(notification.created_at)}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">{notification.body}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
