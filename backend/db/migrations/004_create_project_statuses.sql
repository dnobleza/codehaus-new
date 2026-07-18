-- Lookup table for project lifecycle status, referenced by projects.status_code.
--
-- Design decision: a lookup table (FK'd natural-key `code`) was chosen over a
-- CHECK constraint enum for `projects.status`. The product spec calls for a
-- 20-entry "Project Status" table, but that table's exact entries were not
-- present in the brief handed to this migration (no product spec document
-- was found in the repo under backend/docs or frontend/docs). A CHECK
-- constraint enum would require a schema migration every time a status needs
-- to be renamed, reordered, or corrected against the real spec. A lookup
-- table lets that happen with a plain UPDATE/INSERT/DELETE against this
-- table instead. The `code` values below are therefore a best-effort,
-- clearly-flagged placeholder covering the full client workflow described
-- (request -> review -> quotation -> payment -> build -> delivery), and
-- should be reconciled against the authoritative "Project Status" table the
-- next time it's available. See docs/superpowers/specs/2026-07-17-package-quotation-schema-design.md
-- for full reasoning.
CREATE TABLE project_statuses (
  code VARCHAR(40) PRIMARY KEY,
  label VARCHAR(60) NOT NULL,
  display_order SMALLINT NOT NULL,
  is_terminal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_project_statuses_display_order ON project_statuses(display_order);

-- Placeholder 21-row set (spec says 20; see comment above for why the exact
-- list could not be sourced). Ordered to roughly follow the workflow in the
-- brief: request -> staff review -> quotation -> downpayment -> build ->
-- final payment -> delivery, plus On Hold / Cancelled as workflow escapes.
INSERT INTO project_statuses (code, label, display_order, is_terminal) VALUES
  ('pending_review',        'Pending Review',            10, false),
  ('under_review',          'Under Review',               20, false),
  ('quotation_preparation', 'Quotation In Preparation',   30, false),
  ('quotation_sent',        'Quotation Sent',             40, false),
  ('quotation_accepted',    'Quotation Accepted',         50, false),
  ('quotation_declined',    'Quotation Declined',         60, true),
  ('awaiting_downpayment',  'Awaiting Downpayment',       70, false),
  ('downpayment_submitted', 'Downpayment Submitted',      80, false),
  ('downpayment_verified',  'Downpayment Verified',       90, false),
  ('planning',              'Planning',                  100, false),
  ('design_phase',          'Design Phase',               110, false),
  ('development_in_progress','Development In Progress',  120, false),
  ('client_review',         'Client Review',              130, false),
  ('revision_requested',    'Revision Requested',         140, false),
  ('testing_qa',            'Testing / QA',                150, false),
  ('final_payment_pending', 'Final Payment Pending',      160, false),
  ('final_payment_verified','Final Payment Verified',     170, false),
  ('delivered',             'Delivered',                  180, false),
  ('completed',             'Completed',                  190, true),
  ('on_hold',                'On Hold',                   200, false),
  ('cancelled',              'Cancelled',                 210, true);
