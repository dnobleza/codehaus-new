import { Check } from 'lucide-react';

import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ProjectStatusCode } from '@/shared/types/project.types';
import {
  PROJECT_STATUS_BADGE_VARIANT,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_PHASES,
  getPhaseIndex,
  isExceptionStatus,
} from '../utils/projectStatus';

interface ProjectStatusStepperProps {
  status: ProjectStatusCode;
}

/**
 * Collapses the 21 raw project statuses into a friendly ~6-phase progress
 * indicator (design-system.md §3.8's thin primary-over-muted progress bar,
 * reused here; task brief's "friendly progress indicator... doesn't need
 * to show all 21 raw codes if visually noisy"). The exact `status_code`'s
 * label is always shown via the Badge alongside the bar, so nothing is
 * hidden — only grouped. `on_hold`/`cancelled` render as an interrupting
 * Alert instead of a phase, since the schema design doc documents them as
 * reachable from any status rather than part of the linear flow.
 */
export function ProjectStatusStepper({ status }: ProjectStatusStepperProps) {
  if (isExceptionStatus(status)) {
    return (
      <Alert
        variant={status === 'cancelled' ? 'danger' : 'warning'}
        title={PROJECT_STATUS_LABELS[status]}
        description={
          status === 'on_hold'
            ? 'This project is temporarily paused. Contact support if you have questions.'
            : 'This project request has been cancelled.'
        }
      />
    );
  }

  const currentPhaseIndex = getPhaseIndex(status);
  const progressPercent = ((currentPhaseIndex + 1) / PROJECT_STATUS_PHASES.length) * 100;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">
          {PROJECT_STATUS_PHASES[currentPhaseIndex]?.label ?? 'In Progress'}
        </p>
        <Badge variant={PROJECT_STATUS_BADGE_VARIANT[status]}>{PROJECT_STATUS_LABELS[status]}</Badge>
      </div>

      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {PROJECT_STATUS_PHASES.map((phase, index) => {
          const isComplete = index < currentPhaseIndex;
          const isCurrent = index === currentPhaseIndex;

          return (
            <li key={phase.key} className="flex items-center gap-1.5">
              {isComplete ? (
                <Check className="size-3.5 shrink-0 text-success" aria-hidden="true" />
              ) : (
                <span
                  className={cn(
                    'size-3.5 shrink-0 rounded-full',
                    isCurrent ? 'bg-primary' : 'bg-muted',
                  )}
                  aria-hidden="true"
                />
              )}
              <span
                className={cn(
                  'text-xs',
                  isCurrent ? 'font-semibold text-foreground' : 'text-muted-foreground',
                )}
              >
                {phase.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
