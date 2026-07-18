-- assigned_team, modeled as a join table since multiple staff can be
-- assigned to one project (no existing "team assignment" concept was found
-- elsewhere in the codebase to reuse).
CREATE TABLE project_assignments (
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  assigned_by BIGINT REFERENCES users(user_id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);

CREATE INDEX idx_project_assignments_user_id ON project_assignments(user_id);
