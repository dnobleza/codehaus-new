-- Quotations belong to a project (see 009_create_projects.sql header for the
-- FK-direction reasoning). A project can have more than one quotation over
-- its lifetime (revisions), so this is project 1 : quotations many.
--
-- `quotation_number` is a small addition beyond the spec's literal column
-- list: existing frontend mock data / docs already assume a human-readable
-- "Q-2088"-style identifier exists for display purposes, so it's seeded here
-- via a sequence rather than left for the Backend Engineer to bolt on later.
CREATE SEQUENCE quotation_number_seq START 2001;

CREATE TABLE quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_number VARCHAR(20) NOT NULL DEFAULT ('Q-' || nextval('quotation_number_seq')),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  package_id UUID REFERENCES project_packages(id) ON DELETE RESTRICT,
  base_price NUMERIC(12,2) NOT NULL CHECK (base_price >= 0),
  -- Snapshot of the package's timeline at quote time (packages can change
  -- later; historical quotations must not silently reprice/re-timeline).
  estimated_timeline_min_days INTEGER CHECK (estimated_timeline_min_days IS NULL OR estimated_timeline_min_days >= 0),
  estimated_timeline_max_days INTEGER CHECK (estimated_timeline_max_days IS NULL OR estimated_timeline_max_days >= 0),
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  CONSTRAINT quotations_quotation_number_key UNIQUE (quotation_number),
  CONSTRAINT quotations_timeline_order
    CHECK (
      estimated_timeline_min_days IS NULL
      OR estimated_timeline_max_days IS NULL
      OR estimated_timeline_max_days >= estimated_timeline_min_days
    )
);

CREATE INDEX idx_quotations_project_id ON quotations(project_id);
CREATE INDEX idx_quotations_package_id ON quotations(package_id);
CREATE INDEX idx_quotations_status ON quotations(status);
