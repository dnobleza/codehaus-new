import type { BadgeProps } from '@/components/ui/badge';
import type { QuotationStatus } from '@/shared/types/quotation.types';

/**
 * Client-facing quotation status copy. Deliberately phrased from the
 * client's point of view rather than echoing the raw enum — "Awaiting your
 * response" tells them there's something to do; "sent" does not.
 */
export const QUOTATION_STATUS_LABELS: Record<QuotationStatus, string> = {
  draft: 'Being prepared',
  sent: 'Awaiting your response',
  accepted: 'Accepted',
  rejected: 'Changes requested',
  expired: 'Expired',
};

/** Quotation status → Badge variant, per design-system.md §5. */
export const QUOTATION_STATUS_BADGE_VARIANT: Record<QuotationStatus, BadgeProps['variant']> = {
  draft: 'neutral',
  sent: 'info',
  accepted: 'success',
  rejected: 'warning',
  expired: 'neutral',
};
