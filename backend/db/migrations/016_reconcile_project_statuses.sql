-- Reconciles the placeholder project_statuses seed data from
-- 004_create_project_statuses.sql with the authoritative 21-row "Project
-- Status" table from the product spec, supplied verbatim by the Team Lead
-- after 004 had already been applied with best-guess placeholders. See
-- docs/superpowers/specs/2026-07-17-package-quotation-schema-design.md for
-- full history of why a lookup table (rather than a CHECK constraint enum)
-- was used in the first place -- this migration is exactly the kind of
-- correction that design was meant to make cheap: a data change, not a
-- schema change.
--
-- Codes are stable snake_case derived from each spec display name, matching
-- the casing convention already used by the placeholder rows (e.g.
-- 'waiting_for_client', 'quotation_sent'). display_order mirrors the
-- spec's numbered order exactly (# * 10, so 10..210 for 21 rows).
--
-- is_terminal is set only for 'completed' and 'cancelled' -- the only two
-- states the spec text explicitly frames as an end state ("completed and
-- delivered" / "has been cancelled"). 'quotation_rejected' and 'on_hold'
-- are NOT marked terminal: a rejected quotation can be followed by a new
-- quotation against the same project, and an on-hold project is paused,
-- not ended.
--
-- No transition/state-machine table exists in this schema (project_statuses
-- is a flat lookup, not a graph of valid next-states), so there is nothing
-- to update for "On Hold"/"Cancelled" reachability -- both are already
-- selectable from any project regardless of its current status_code.

-- Safety check: fail loudly (rather than relying solely on the
-- ON DELETE RESTRICT below) if any live `projects` row references a status
-- code that is about to be removed.
DO $$
DECLARE
  stale_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO stale_count
  FROM projects p
  WHERE p.status_code NOT IN (
    'draft', 'submitted', 'under_review', 'waiting_for_client', 'quotation_sent',
    'quotation_accepted', 'quotation_rejected', 'payment_pending',
    'payment_verification', 'accepted', 'scheduled', 'in_development',
    'in_testing', 'client_review', 'revision_requested', 'revision_in_progress',
    'ready_for_deployment', 'deployed', 'completed', 'on_hold', 'cancelled'
  );

  IF stale_count > 0 THEN
    RAISE EXCEPTION 'Cannot reconcile project_statuses: % project row(s) reference a status_code not in the reconciled 21-row list', stale_count;
  END IF;
END $$;

DELETE FROM project_statuses;

INSERT INTO project_statuses (code, label, display_order, is_terminal) VALUES
  ('draft',                'Draft',                 10, false),
  ('submitted',            'Submitted',              20, false),
  ('under_review',         'Under Review',           30, false),
  ('waiting_for_client',   'Waiting for Client',     40, false),
  ('quotation_sent',       'Quotation Sent',         50, false),
  ('quotation_accepted',   'Quotation Accepted',     60, false),
  ('quotation_rejected',   'Quotation Rejected',     70, false),
  ('payment_pending',      'Payment Pending',        80, false),
  ('payment_verification', 'Payment Verification',   90, false),
  ('accepted',             'Accepted',              100, false),
  ('scheduled',            'Scheduled',             110, false),
  ('in_development',       'In Development',        120, false),
  ('in_testing',           'In Testing',            130, false),
  ('client_review',        'Client Review',         140, false),
  ('revision_requested',   'Revision Requested',    150, false),
  ('revision_in_progress', 'Revision In Progress',  160, false),
  ('ready_for_deployment', 'Ready for Deployment',  170, false),
  ('deployed',             'Deployed',              180, false),
  ('completed',            'Completed',             190, true),
  ('on_hold',              'On Hold',               200, false),
  ('cancelled',            'Cancelled',             210, true);

-- The old placeholder default ('pending_review') no longer exists in
-- project_statuses. 'submitted' is the correct new-project default: it
-- matches the spec's row 2 ("Project request has been submitted"), which is
-- the state a project lands in immediately after the Client Workflow's
-- step-5 request submission -- 'draft' (row 1) is reserved for a client
-- still composing the request, before a `projects` row would typically be
-- persisted.
ALTER TABLE projects ALTER COLUMN status_code SET DEFAULT 'submitted';
