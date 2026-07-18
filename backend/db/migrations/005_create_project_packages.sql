-- Catalog of purchasable/quotable website packages (Starter, Business,
-- Corporate, and a catch-all "Custom Project" row with is_custom = true).
CREATE TABLE project_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(140) NOT NULL,
  description TEXT,
  base_price NUMERIC(12,2) CHECK (base_price IS NULL OR base_price >= 0),
  estimated_timeline_min_days INTEGER CHECK (estimated_timeline_min_days IS NULL OR estimated_timeline_min_days >= 0),
  estimated_timeline_max_days INTEGER CHECK (estimated_timeline_max_days IS NULL OR estimated_timeline_max_days >= 0),
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  thumbnail_url TEXT,
  banner_url TEXT,
  is_custom BOOLEAN NOT NULL DEFAULT false,
  created_by BIGINT REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT project_packages_slug_key UNIQUE (slug),
  -- Only the custom catch-all package may omit a base price; every concrete
  -- package must be priced.
  CONSTRAINT project_packages_price_required_unless_custom
    CHECK (is_custom = true OR base_price IS NOT NULL),
  CONSTRAINT project_packages_timeline_order
    CHECK (
      estimated_timeline_min_days IS NULL
      OR estimated_timeline_max_days IS NULL
      OR estimated_timeline_max_days >= estimated_timeline_min_days
    )
);

CREATE INDEX idx_project_packages_is_active ON project_packages(is_active);
CREATE INDEX idx_project_packages_display_order ON project_packages(display_order);
CREATE INDEX idx_project_packages_created_by ON project_packages(created_by);

CREATE TRIGGER trg_project_packages_set_updated_at
BEFORE UPDATE ON project_packages
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
