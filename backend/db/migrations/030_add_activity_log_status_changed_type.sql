-- Widens activity_log.action_type to add 'project_status_changed'.
--
-- 029_add_activity_log_commercial_action_types.sql audited five commercial
-- actions: payment_verified, payment_rejected, project_accepted,
-- project_declined, project_delivered. It missed the sixth: the generic
-- `PATCH /admin/projects/:id/status` endpoint (updateProjectStatusAdmin) that
-- moves a project through every OTHER status change -- scheduled, in_testing,
-- ready_for_deployment, on_hold, and so on. Those are exactly the transitions
-- 6dca2fe's project-status transition graph now polices; the graph proves a
-- move was LEGAL, but leaves no record of WHO made it. A segregation-of-duties
-- trail with a hole at its most-used entry point is not a trail.
--
-- Idempotent in the house style of 016_reconcile_project_statuses.sql: the
-- constraint is dropped IF EXISTS and recreated, so a repeated run converges
-- on the same state rather than failing on a duplicate constraint name.

-- Guard: refuse to proceed if any existing row holds a value the new
-- constraint would not accept. The new list is a strict superset of the old
-- one, so this can only fire if the table was written to out of band.
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM activity_log
  WHERE action_type NOT IN (
    'file_uploaded', 'task_completed', 'progress_updated', 'milestone_completed', 'commented',
    'payment_verified', 'payment_rejected', 'project_accepted', 'project_declined', 'project_delivered',
    'project_status_changed'
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
    -- Financial and commercial events (029, unchanged).
    'payment_verified',
    'payment_rejected',
    'project_accepted',
    'project_declined',
    'project_delivered',
    -- This migration: the generic admin/staff status-change endpoint.
    'project_status_changed'
  ));
