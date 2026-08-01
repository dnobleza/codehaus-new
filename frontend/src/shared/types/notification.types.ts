/**
 * The events that produce a notification today. All seven are admin/staff
 * actions on a client's project — see
 * `backend/src/services/notifications.service.js`'s EVENT_BUILDERS, which owns
 * the copy and the destination link for each.
 *
 * Kept in sync with the `event_type` CHECK constraint on the notifications
 * table (025_create_notifications.sql, extended by 026).
 */
export type NotificationEventType =
  | 'quotation_sent'
  | 'payment_verified'
  | 'payment_rejected'
  | 'project_accepted'
  | 'project_declined'
  | 'project_delivered'
  | 'project_status_changed';

/**
 * Matches the raw `notifications` row (025_create_notifications.sql).
 *
 * `title`/`body` are pre-rendered server-side and deliberately frozen at write
 * time — a notification describes something that already happened, so its
 * wording must not change later when the underlying record is edited.
 *
 * `link` is a root-relative frontend path, or `null` for a notification with
 * no destination.
 */
export interface AppNotification {
  id: string;
  user_id: number | string;
  project_id: string | null;
  event_type: NotificationEventType;
  title: string;
  body: string;
  link: string | null;
  /** `null` while unread. */
  read_at: string | null;
  created_at: string;
}

/** `GET /notifications` — the inbox plus its unread count, in one round trip. */
export interface NotificationsResponse {
  notifications: AppNotification[];
  unreadCount: number;
}
