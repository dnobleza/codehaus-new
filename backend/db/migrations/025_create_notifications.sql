-- Per-user notification inbox. Written by the service layer whenever an
-- admin/staff action produces something the owning client needs to know about
-- (a quotation sent to them, their payment verified or rejected, their request
-- accepted or declined, their project delivered).
--
-- Distinct from activity_log (022_create_activity_log.sql), which is a
-- PROJECT-scoped, immutable narrative of what happened and is read by everyone
-- with access to that project. Notifications are USER-scoped and carry read
-- state — the same underlying event produces an activity row for the project's
-- history and a notification row for the one person who must act on it. They
-- are deliberately separate tables rather than one with a nullable user_id:
-- merging them would put mutable per-user read state on rows that are supposed
-- to be immutable history.
--
-- `body` is a pre-rendered, human-readable line rather than something
-- reconstructed from structured fields at read time — the same reasoning as
-- activity_log's `summary`. A notification describes something that already
-- happened, so its wording must not silently change later when the underlying
-- record is edited or the rendering code is refactored.
--
-- `link` is a root-relative frontend path (e.g.
-- '/client/dashboard/quotations/{projectId}/{quotationId}') so clicking a
-- notification lands the user on the thing it is about. Nullable: not every
-- notification necessarily has a destination.
--
-- `project_id` is ON DELETE CASCADE — a notification about a deleted project
-- has nothing left to point at. `user_id` is likewise CASCADE: this is the
-- user's own inbox, and it dies with the account (unlike activity_log's
-- actor_user_id, which is SET NULL precisely because the project's history
-- must survive the actor being removed).
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  event_type VARCHAR(40) NOT NULL CHECK (event_type IN (
    'quotation_sent',
    'payment_verified',
    'payment_rejected',
    'project_accepted',
    'project_declined',
    'project_delivered'
  )),
  title VARCHAR(120) NOT NULL,
  body TEXT NOT NULL,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The inbox is always read as "this user's notifications, newest first", so a
-- composite (user_id, created_at DESC) serves that access pattern directly
-- rather than needing a separate sort.
CREATE INDEX idx_notifications_user_id_created_at ON notifications(user_id, created_at DESC);

-- Partial index: the unread badge count queries ONLY unread rows, and unread
-- is the small, shrinking subset of a growing table. Indexing just those rows
-- keeps the badge query cheap no matter how much read history accumulates.
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE read_at IS NULL;
