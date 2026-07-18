/**
 * Converts a day-based timeline range (as stored on both `project_packages`
 * and `quotations` — see the schema design doc's "1 week = 7 days"
 * conversion note) into the spec's "N Week(s)"/"N-M Weeks" wording used by
 * the package browser and the quotation worked example alike.
 */
export function formatTimelineRange(
  minDays: number | null | undefined,
  maxDays: number | null | undefined,
): string | null {
  if (minDays == null || maxDays == null) return null;

  const minWeeks = Math.round(minDays / 7);
  const maxWeeks = Math.round(maxDays / 7);

  if (minWeeks === maxWeeks) {
    return `${minWeeks} Week${minWeeks === 1 ? '' : 's'}`;
  }
  return `${minWeeks}-${maxWeeks} Weeks`;
}
