-- Pages included in a given package (e.g. "Home", "About", "Blog"),
-- owned entirely by their package -> cascades on package delete.
CREATE TABLE package_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES project_packages(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_package_pages_package_id ON package_pages(package_id);
