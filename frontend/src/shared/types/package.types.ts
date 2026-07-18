export interface PackagePage {
  id: string;
  name: string;
  displayOrder: number;
}

export interface PackageFeature {
  id: string;
  name: string;
  displayOrder: number;
}

/**
 * Matches the raw shape returned by `GET /packages` and `GET /packages/:id`
 * exactly, verified against the live API. Top-level columns are snake_case
 * (raw Postgres row fields — numeric columns are serialized as strings by
 * the `pg` driver), while the nested `pages`/`features` arrays are camelCase
 * (built server-side via `json_build_object` in
 * `backend/src/repositories/packages.repository.js`'s `PACKAGE_DETAIL_QUERY`)
 * — this snake_case/camelCase split within a single object is real and
 * intentional on the backend, not a typo to "fix" client-side.
 */
export interface Package {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  /** NUMERIC(12,2) as a string (e.g. "45000.00"); null only when `is_custom` is true. */
  base_price: string | null;
  estimated_timeline_min_days: number | null;
  estimated_timeline_max_days: number | null;
  display_order: number;
  is_active: boolean;
  thumbnail_url: string | null;
  banner_url: string | null;
  is_custom: boolean;
  created_by: number | string | null;
  created_at: string;
  updated_at: string;
  pages: PackagePage[];
  features: PackageFeature[];
}
