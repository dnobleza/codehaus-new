-- Human-readable project reference code (e.g. "CH-2026-0007") for the
-- "Project Overview" page and any client-facing communication (emails,
-- support requests) where a raw UUID is unusable. "CH" is a fixed prefix
-- for CodeHaus, followed by the calendar year the project was created and
-- a per-year, zero-padded 4-digit sequence number ordered by created_at
-- (e.g. the 7th project created in 2026 backfills as CH-2026-0007; a
-- project created in 2027 restarts the per-year sequence at CH-2027-0001).
--
-- Nullable + UNIQUE (not NOT NULL) is deliberate: this migration only
-- backfills EXISTING rows as a one-time data fix. Generating
-- reference_code for NEW projects going forward is the Backend Engineer's
-- responsibility (stage 2 of this Project Overview pipeline) -- it should
-- be assigned inside projects.service.js's createProject (or an
-- equivalent DB function/trigger, if collision-safety under concurrent
-- inserts is a concern) using this exact same
-- 'CH-<year>-<4-digit per-year sequence>' scheme, so codes issued from
-- this point forward stay consistent with this backfill. Until the
-- Backend Engineer wires that up, newly INSERTed projects will simply have
-- a NULL reference_code -- callers must handle that, not assume NOT NULL.
ALTER TABLE projects ADD COLUMN reference_code VARCHAR(20) UNIQUE;

WITH numbered AS (
  SELECT
    id,
    'CH-' || EXTRACT(YEAR FROM created_at)::INT::TEXT || '-' ||
      LPAD(
        ROW_NUMBER() OVER (PARTITION BY EXTRACT(YEAR FROM created_at) ORDER BY created_at)::TEXT,
        4, '0'
      ) AS reference_code
  FROM projects
)
UPDATE projects p
SET reference_code = numbered.reference_code
FROM numbered
WHERE p.id = numbered.id;
