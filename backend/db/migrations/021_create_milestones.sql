-- Per-project delivery roadmap for the client-facing "Project Overview"
-- page (Team Lead's stage-1 DB brief for that feature; no separate spec
-- doc was found under backend/docs or frontend/docs, so this migration
-- follows the brief directly).
--
-- One row per phase of a project's delivery plan (Project Planning,
-- Design & Prototyping, Frontend Development, Backend Development,
-- Testing & Deployment -- see 024_seed_milestone_demo_data.sql for the
-- concrete seed of that 5-phase plan). `sequence` orders the phases for a
-- given project and is UNIQUE per project rather than a global
-- auto-incrementing column, because phase ordering is only meaningful
-- within a single project's roadmap -- mirrors
-- payment_installments.sequence (018_create_payment_installments.sql) for
-- the same reason.
--
-- `status` is a CHECK-constrained enum here (not a lookup table like
-- project_statuses, 004_create_project_statuses.sql) because, unlike the
-- project lifecycle status, this is a small, fixed, stable 3-state
-- workflow (not_started -> in_progress -> completed) intrinsic to what a
-- "milestone" means -- it is not expected to be extended/reconciled
-- against an evolving business spec the way project_statuses was.
--
-- `current_focus` is free text meant to be shown ONLY for whichever
-- milestone is currently 'in_progress' in the UI (per the brief). That is
-- a display/business rule, not a structural invariant, so it is left
-- nullable and unconstrained here rather than enforced with a partial
-- unique index or trigger.
--
-- start_date/end_date are plain DATE (not TIMESTAMPTZ): per commit
-- 80bfb34, DATE columns in this codebase must round-trip as plain
-- 'YYYY-MM-DD' strings (see src/config/database.js's DATE type parser),
-- and a milestone date is a calendar date, not a point-in-time event.
CREATE TABLE milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sequence SMALLINT NOT NULL,
  name VARCHAR(120) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  progress_percent SMALLINT NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  start_date DATE,
  end_date DATE,
  current_focus TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT milestones_project_sequence_key UNIQUE (project_id, sequence),
  CONSTRAINT milestones_date_order CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

CREATE INDEX idx_milestones_project_id ON milestones(project_id);

CREATE TRIGGER trg_milestones_set_updated_at
BEFORE UPDATE ON milestones
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
