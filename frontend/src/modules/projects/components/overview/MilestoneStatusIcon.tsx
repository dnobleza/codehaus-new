import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { MilestoneStatus } from '@/shared/types/projectOverview.types';
import { MILESTONE_STATUS_LABEL } from '../../utils/milestoneStatus';

interface MilestoneStatusIconProps {
  status: MilestoneStatus;
  className?: string;
}

/**
 * Per-milestone status glyph: check for completed, a filled/pulsing dot for
 * in_progress, an empty ring for not_started. Color is never the only
 * signal (design-system.md §5) — every usage site also renders the status
 * as text/Badge alongside this icon.
 */
export function MilestoneStatusIcon({ status, className }: MilestoneStatusIconProps) {
  const label = MILESTONE_STATUS_LABEL[status];

  if (status === 'completed') {
    return (
      <span
        role="img"
        aria-label={label}
        className={cn(
          'flex size-5 shrink-0 items-center justify-center rounded-full bg-success/10 text-success',
          className,
        )}
      >
        <Check className="size-3.5" aria-hidden="true" />
      </span>
    );
  }

  if (status === 'in_progress') {
    return (
      <span
        role="img"
        aria-label={label}
        className={cn('relative flex size-5 shrink-0 items-center justify-center', className)}
      >
        <span
          className="absolute size-3 animate-ping rounded-full bg-primary/50"
          aria-hidden="true"
        />
        <span className="relative size-2.5 rounded-full bg-primary" aria-hidden="true" />
      </span>
    );
  }

  return (
    <span
      role="img"
      aria-label={label}
      className={cn(
        'flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-muted',
        className,
      )}
    />
  );
}
