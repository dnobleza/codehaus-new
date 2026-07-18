-- Features included in a given package (e.g. "Responsive Design", "Basic SEO"),
-- owned entirely by their package -> cascades on package delete.
CREATE TABLE package_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES project_packages(id) ON DELETE CASCADE,
  name VARCHAR(160) NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_package_features_package_id ON package_features(package_id);
