import { GitBranch } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/shared/components/common/EmptyState';
import { formatShortDate } from '@/shared/utils/dateOnly';
import type { ProjectMilestone } from '@/shared/types/projectOverview.types';
import {
  MILESTONE_STATUS_BADGE_VARIANT,
  MILESTONE_STATUS_LABEL,
} from '../../utils/milestoneStatus';
import { MilestoneStatusIcon } from './MilestoneStatusIcon';

interface ProjectTimelineCardProps {
  milestones: ProjectMilestone[];
  className?: string;
}

function formatDateRange(startDate: string | null, endDate: string | null): string {
  if (!startDate && !endDate) return 'Not yet scheduled';
  if (startDate && endDate) return `${formatShortDate(startDate)} – ${formatShortDate(endDate)}`;
  if (startDate) return `Starts ${formatShortDate(startDate)}`;
  return `Target: ${formatShortDate(endDate as string)}`;
}

/**
 * "Project Timeline" card: vertical stepper over the same milestones data
 * (Overview tab grid position 3, and reused as-is for the full-width
 * Timeline tab). The in_progress milestone gets a nested "Current Focus"
 * box — only rendered when `currentFocus` is non-null, per the backend's
 * explicit flag that it's null on every milestone except possibly one.
 */
export function ProjectTimelineCard({ milestones, className }: ProjectTimelineCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Project Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        {milestones.length === 0 ? (
          <EmptyState
            icon={GitBranch}
            title="Timeline not available yet"
            description="This project's timeline will appear here once it enters active development."
          />
        ) : (
          <ol className="flex flex-col">
            {milestones.map((milestone, index) => (
              <li key={milestone.id} className="relative flex gap-3 pb-6 last:pb-0">
                {index < milestones.length - 1 && (
                  <span
                    className="absolute top-5 left-[9px] h-[calc(100%-4px)] w-px bg-border"
                    aria-hidden="true"
                  />
                )}
                <MilestoneStatusIcon status={milestone.status} className="relative z-10 bg-card" />
                <div className="flex flex-1 flex-col gap-1 pb-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">{milestone.name}</span>
                    <Badge variant={MILESTONE_STATUS_BADGE_VARIANT[milestone.status]}>
                      {MILESTONE_STATUS_LABEL[milestone.status]}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDateRange(milestone.startDate, milestone.endDate)}
                  </p>

                  {milestone.status === 'in_progress' && milestone.currentFocus && (
                    <div className="mt-2 rounded-md border border-primary/20 bg-primary/5 p-3">
                      <p className="text-xs font-semibold text-primary">Current Focus</p>
                      <p className="mt-1 text-sm text-foreground">{milestone.currentFocus}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {milestone.progressPercent}% complete
                      </p>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
