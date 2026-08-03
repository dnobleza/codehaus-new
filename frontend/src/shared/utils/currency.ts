/**
 * Parses a money value that may arrive as a numeric string (Postgres
 * NUMERIC columns are serialized as strings by the `pg` driver — e.g.
 * `quotation.total_amount`) or as an actual number (values built via
 * Postgres `json_build_object`, e.g. `quotation.addons[].priceAtTime`)
 * into a plain number.
 */
export function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;
  return typeof value === 'number' ? value : Number(value);
}

// `minimumFractionDigits: 0` matches the product spec's worked example
// exactly (e.g. "₱81,500", not "₱81,500.00") while still showing cents for
// any non-whole-peso amount.
const phpFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  currencyDisplay: 'narrowSymbol',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/**
 * Converts a peso amount into an exact integer number of centavos.
 *
 * Mirrors `backend/src/utils/money.js`'s `toCentavos`. Money comparisons must
 * never happen in float space — `Number('98000.00') === Number('98000')` is
 * fine, but arithmetic on those floats is not (0.1 + 0.2 !== 0.3), and both
 * sides of a comparison here originate as NUMERIC strings from Postgres.
 * Compare centavo integers instead.
 *
 * Returns `null` for values that aren't finite numbers, so callers reject bad
 * input explicitly rather than treating it as 0.
 */
export function toCentavos(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const asNumber = Number(value);
  if (!Number.isFinite(asNumber)) return null;
  return Math.round(asNumber * 100);
}

/** Formats a peso amount per design-system.md's currency convention (₱, thousands separators). */
export function formatPHP(value: number | string | null | undefined): string {
  return phpFormatter.format(toNumber(value));
}
