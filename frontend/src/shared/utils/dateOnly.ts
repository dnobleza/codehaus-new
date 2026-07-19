/**
 * Parses a DATE-only string (e.g. "2026-07-18", no time component) from its
 * literal year/month/day parts rather than handing the bare string to
 * `new Date()` directly, which parses as UTC midnight and can roll back a
 * day once rendered in a timezone behind UTC. Same fix as
 * `modules/payments/components/PaymentScheduleCard.tsx`'s local
 * `parseDateOnly`, promoted here so the new Project Overview components
 * don't duplicate it a third/fourth time.
 */
export function parseDateOnly(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** Formats a DATE-only string as e.g. "Jul 18, 2026". */
export function formatShortDate(dateStr: string): string {
  return parseDateOnly(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
