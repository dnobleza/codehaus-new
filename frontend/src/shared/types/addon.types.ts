/** Exact snake_case category strings from the `addons.category` CHECK constraint. */
export type AddonCategory =
  | 'authentication'
  | 'dashboard'
  | 'payments'
  | 'reports'
  | 'communication'
  | 'integrations';

/**
 * Matches the raw row shape returned by `GET /addons` exactly (verified
 * against the live API — flat list, no envelope nesting beyond
 * `ApiEnvelope<Addon[]>`).
 */
export interface Addon {
  id: string;
  category: AddonCategory;
  name: string;
  /** NUMERIC(12,2) serialized as a string by the `pg` driver (e.g. "12000.00"). */
  price: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
