-- Append-only feed of notable project events for the "Project Overview"
-- page's activity feed. Rows are expected to be written by the backend
-- service layer whenever a tracked action happens (a file upload, a task
-- completion, a milestone's progress_percent changing, a milestone being
-- marked completed, or a client/staff comment) -- see milestones
-- (021_create_milestones.sql) for the roadmap this feed narrates.
--
-- No `updated_at` column/trigger here, unlike every other table in this
-- schema -- activity rows are immutable history, never edited after being
-- written, only appended to (or removed via the project's ON DELETE
-- CASCADE). `summary` is a pre-rendered, human-readable line (not
-- reconstructed from `metadata` at read time) so the feed keeps reading
-- correctly even if the shape of `metadata` changes later. `metadata`
-- carries the structured detail (e.g.
-- {"from":60,"to":75,"target":"Backend Development"} for a
-- progress_updated row) for anything that needs to consume the event
-- programmatically rather than just display it.
--
-- `actor_user_id` is nullable with ON DELETE SET NULL (not CASCADE):
-- deleting the user who performed an action must not erase the fact that
-- it happened -- the feed row survives as an unattributed entry instead.
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  actor_user_id BIGINT REFERENCES users(user_id) ON DELETE SET NULL,
  action_type VARCHAR(40) NOT NULL CHECK (action_type IN ('file_uploaded', 'task_completed', 'progress_updated', 'milestone_completed', 'commented')),
  summary TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Composite, not a plain project_id index: the feed is always read as
-- "latest activity for project X, paginated", so (project_id, created_at
-- DESC) serves that access pattern directly instead of requiring a
-- separate sort step.
CREATE INDEX idx_activity_log_project_id_created_at ON activity_log(project_id, created_at DESC);
CREATE INDEX idx_activity_log_actor_user_id ON activity_log(actor_user_id);
