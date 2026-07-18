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

/** Formats a peso amount per design-system.md's currency convention (₱, thousands separators). */
export function formatPHP(value: number | string | null | undefined): string {
  return phpFormatter.format(toNumber(value));
}
