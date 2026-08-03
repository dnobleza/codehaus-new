-- Widens activity_log.action_type to cover FINANCIAL AND COMMERCIAL actions.
--
-- 022_create_activity_log.sql built the table for the Project Overview page's
-- delivery-progress feed, so its CHECK constraint enumerates only delivery
-- events: file_uploaded, task_completed, progress_updated, milestone_completed,
-- commented. That list is the reason this migration has to exist -- without it
-- every INSERT below would fail with a 23514 check violation at runtime.
--
-- WHY THESE FIVE, AND NOTHING ELSE:
-- Payment verification was deliberately made admin-only for segregation of
-- duties (see the doc comments in routes/adminPayments.route.js). A segregation
-- control is close to worthless without an immutable record of who exercised
-- it: "only admins may approve money" is unenforceable after the fact if
-- nobody can say WHICH admin approved WHICH payment. These five are exactly the
-- state changes that move money or make a commercial commitment:
--
--   payment_verified   -- an admin accepted a client's money as settled
--   payment_rejected   -- an admin refused it (carries the 028 reason)
--   project_accepted   -- a submitted request was taken on
--   project_declined   -- a submitted request was refused (carries the 017 reason)
--   project_delivered  -- the fully-paid gate was passed and delivery declared
--
-- Reads, lists, and milestone progress updates are deliberately NOT added:
-- progress updates are already logged (projectOverview.service.js), and logging
-- reads would drown the commercial signal this table now has to carry in noise.
--
-- The table's own append-only guarantees are untouched: no updated_at, no
-- trigger, rows are only ever inserted. actor_user_id keeps its ON DELETE SET
-- NULL, so deleting a user degrades an entry to unattributed rather than
-- erasing the fact that the action happened -- which is the correct behaviour
-- for an audit trail.
--
-- Idempotent in the house style of 016_reconcile_project_statuses.sql: the
-- constraint is dropped IF EXISTS and recreated, so a repeated run converges on
-- the same state rather than failing on a duplicate constraint name.

-- Guard: refuse to proceed if any existing row holds a value that the new
-- constraint would not accept. The new list is a strict superset of the old
-- one, so this can only fire if the table was written to out of band -- in
-- which case failing loudly beats silently failing to re-add the constraint.
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM activity_log
  WHERE action_type NOT IN (
    'file_uploaded', 'task_completed', 'progress_updated', 'milestone_completed', 'commented',
    'payment_verified', 'payment_rejected', 'project_accepted', 'project_declined', 'project_delivered'
  );

  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'Cannot widen activity_log.action_type: % row(s) hold a value outside the new list', invalid_count;
  END IF;
END $$;

ALTER TABLE activity_log DROP CONSTRAINT IF EXISTS activity_log_action_type_check;

ALTER TABLE activity_log
  ADD CONSTRAINT activity_log_action_type_check
  CHECK (action_type IN (
    -- Delivery events (022, unchanged).
    'file_uploaded',
    'task_completed',
    'progress_updated',
    'milestone_completed',
    'commented',
    -- Financial and commercial events (this migration).
    'payment_verified',
    'payment_rejected',
    'project_accepted',
    'project_declined',
    'project_delivered'
  ));

-- The audit trail is queried two ways the existing indexes do not serve:
-- "everything this actor did" across projects (an accountability review of one
-- admin), and "every financial action in this period" (a reconciliation pass).
-- 022 indexed (project_id, created_at DESC) and (actor_user_id) -- the latter
-- unordered, so an actor-scoped review still needs a sort. This replaces it
-- with a composite that serves the ordered access pattern directly.
DROP INDEX IF EXISTS idx_activity_log_actor_user_id;
CREATE INDEX IF NOT EXISTS idx_activity_log_actor_user_id_created_at
  ON activity_log(actor_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_log_action_type_created_at
  ON activity_log(action_type, created_at DESC);
