-- Reusable trigger function to keep `updated_at` columns accurate on every
-- UPDATE, without relying on application code to remember to set it.
-- Applied to project_packages, addons, and projects in their own migrations.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
