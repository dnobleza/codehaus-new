-- Join table: which add-ons were selected for a given quotation, with a
-- price snapshot so later catalog price changes never silently reprice a
-- historical quotation.
CREATE TABLE quotation_addons (
  quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  addon_id UUID NOT NULL REFERENCES addons(id) ON DELETE RESTRICT,
  price_at_time NUMERIC(12,2) NOT NULL CHECK (price_at_time >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (quotation_id, addon_id)
);

CREATE INDEX idx_quotation_addons_addon_id ON quotation_addons(addon_id);
