import type { AddonCategory } from './addon.types';

export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';

/**
 * Nested add-on line item. Only present when a quotation is fetched nested
 * inside a `Project` via `GET /projects/:id`
 * (`quotations.repository.js#listByProjectWithAddons` builds this with
 * `json_build_object`, so keys are camelCase and `priceAtTime` is a genuine
 * JSON number — NOT a string, unlike the quotation's own top-level money
 * columns below). Verified against the live API.
 */
export interface QuotationAddon {
  addonId: string;
  name: string;
  category: AddonCategory;
  priceAtTime: number;
}

/**
 * Matches the raw `quotations` row shape, verified against the live API.
 * `addons` is only populated when nested inside a `Project` fetched via
 * `GET /projects/:id` — the response from `POST /projects/:id/quotations`
 * (create) and the accept/reject endpoints does NOT include it. Callers
 * needing the line-item breakdown right after creation should re-fetch the
 * parent project rather than assume a nested `addons` field is present.
 */
export interface Quotation {
  id: string;
  quotation_number: string;
  project_id: string;
  package_id: string | null;
  /** NUMERIC(12,2) as a string. */
  base_price: string;
  estimated_timeline_min_days: number | null;
  estimated_timeline_max_days: number | null;
  /** NUMERIC(12,2) as a string. */
  discount_amount: string;
  /** NUMERIC(12,2) as a string. */
  total_amount: string;
  status: QuotationStatus;
  created_at: string;
  sent_at: string | null;
  responded_at: string | null;
  addons?: QuotationAddon[];
}
