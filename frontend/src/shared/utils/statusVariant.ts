import type { BadgeProps } from '@/components/ui/badge';

type BadgeVariant = NonNullable<BadgeProps['variant']>;

/** Project status → Badge variant, per design-system.md §3.8. */
export const PROJECT_STATUS_VARIANT: Record<string, BadgeVariant> = {
  Planning: 'neutral',
  'In Progress': 'primary',
  Review: 'warning',
  Completed: 'success',
  'On Hold': 'danger',
};

/** Invoice status → Badge variant, per design-system.md §3.5. */
export const INVOICE_STATUS_VARIANT: Record<string, BadgeVariant> = {
  Draft: 'neutral',
  Sent: 'info',
  Paid: 'success',
  Overdue: 'danger',
  'Partially Paid': 'warning',
};

/** Support ticket status → Badge variant, per design-system.md §3.13. */
export const TICKET_STATUS_VARIANT: Record<string, BadgeVariant> = {
  Open: 'info',
  'In Progress': 'warning',
  Resolved: 'success',
  Closed: 'neutral',
};
