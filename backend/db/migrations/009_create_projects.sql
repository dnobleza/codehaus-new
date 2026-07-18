-- Projects hold the client's project *request* and its lifecycle through to
-- completion. A quotation is generated FOR a project (see 011_create_quotations.sql),
-- not the other way around: per the Client Workflow in the brief, a project
-- request is submitted first (step 5), then reviewed, and only then is a
-- quotation generated against it. That ordering means `quotations.project_id`
-- is the FK, not `projects.quotation_id` -- a project can accumulate more
-- than one quotation over time (e.g. revised after client feedback) without
-- restructuring the schema.
--
-- `title` and `request_details` are not in the literal column list the spec
-- gave for this table, but are added here because without them a "project
-- request" (step 5 of the Client Workflow) has nowhere to store what the
-- client actually asked for prior to a quotation existing. Flagged as an
-- addition for the Backend Engineer's awareness.
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  package_id UUID REFERENCES project_packages(id) ON DELETE RESTRICT,
  title VARCHAR(200) NOT NULL,
  request_details TEXT,
  status_code VARCHAR(40) NOT NULL DEFAULT 'pending_review' REFERENCES project_statuses(code) ON DELETE RESTRICT ON UPDATE CASCADE,
  timeline_estimate_min_days INTEGER CHECK (timeline_estimate_min_days IS NULL OR timeline_estimate_min_days >= 0),
  timeline_estimate_max_days INTEGER CHECK (timeline_estimate_max_days IS NULL OR timeline_estimate_max_days >= 0),
  start_date DATE,
  end_date DATE,
  completion_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT projects_timeline_order
    CHECK (
      timeline_estimate_min_days IS NULL
      OR timeline_estimate_max_days IS NULL
      OR timeline_estimate_max_days >= timeline_estimate_min_days
    ),
  CONSTRAINT projects_date_order
    CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_projects_package_id ON projects(package_id);
CREATE INDEX idx_projects_status_code ON projects(status_code);

CREATE TRIGGER trg_projects_set_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
