-- Shared add-on catalog. Add-ons are NOT package-specific: clients pick from
-- this catalog regardless of which package (or custom project) they choose,
-- per the "Additional Features" section of the spec.
CREATE TABLE addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(40) NOT NULL CHECK (
    category IN ('authentication', 'dashboard', 'payments', 'reports', 'communication', 'integrations')
  ),
  name VARCHAR(120) NOT NULL,
  price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT addons_category_name_key UNIQUE (category, name)
);

CREATE INDEX idx_addons_is_active ON addons(is_active);
CREATE INDEX idx_addons_category ON addons(category);

CREATE TRIGGER trg_addons_set_updated_at
BEFORE UPDATE ON addons
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
