interface RelativeTimeBucket {
  limitSeconds: number;
  divisor: number;
  unit: Intl.RelativeTimeFormatUnit;
}

const BUCKETS: RelativeTimeBucket[] = [
  { limitSeconds: 60, divisor: 1, unit: 'second' },
  { limitSeconds: 3600, divisor: 60, unit: 'minute' },
  { limitSeconds: 86400, divisor: 3600, unit: 'hour' },
  { limitSeconds: 604800, divisor: 86400, unit: 'day' },
  { limitSeconds: 2629800, divisor: 604800, unit: 'week' },
  { limitSeconds: 31557600, divisor: 2629800, unit: 'month' },
  { limitSeconds: Infinity, divisor: 31557600, unit: 'year' },
];

const relativeTimeFormatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

/**
 * Formats an ISO timestamp as a friendly relative string (e.g. "2 hours
 * ago", "in 3 days"). Built on the standard `Intl.RelativeTimeFormat` —
 * no date library needed (design-system.md/task brief guidance: don't add a
 * new dependency when the platform already covers it).
 */
export function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';

  const diffSeconds = (date.getTime() - Date.now()) / 1000;
  const absSeconds = Math.abs(diffSeconds);

  const bucket =
    BUCKETS.find((candidate) => absSeconds < candidate.limitSeconds) ?? BUCKETS[BUCKETS.length - 1];
  const value = Math.round(diffSeconds / bucket.divisor);
  return relativeTimeFormatter.format(value, bucket.unit);
}
