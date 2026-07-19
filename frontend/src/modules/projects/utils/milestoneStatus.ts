import type { BadgeProps } from '@/components/ui/badge';
import type { MilestoneStatus } from '@/shared/types/projectOverview.types';

type BadgeVariant = NonNullable<BadgeProps['variant']>;

/** Friendly label per milestone status, per `projectOverview.service.js`'s status vocabulary. */
export const MILESTONE_STATUS_LABEL: Record<MilestoneStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed',
};

/** Milestone status -> Badge variant, following design-system.md §2.9's semantic palette. */
export const MILESTONE_STATUS_BADGE_VARIANT: Record<MilestoneStatus, BadgeVariant> = {
  not_started: 'neutral',
  in_progress: 'primary',
  completed: 'success',
};
