import { ListChecks } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/shared/components/common/EmptyState';
import type { ProjectMilestone } from '@/shared/types/projectOverview.types';
import { MilestoneStatusIcon } from './MilestoneStatusIcon';

interface MilestoneProgressCardProps {
  milestones: ProjectMilestone[];
  className?: string;
}

/**
 * "Milestone Progress" card (Overview tab grid position 2, and reused
 * as-is for the full-width Milestones tab): each milestone's status icon +
 * name + horizontal progress bar (`--primary` over `--muted`) + percent.
 */
export function MilestoneProgressCard({ milestones, className }: MilestoneProgressCardProps) {
  const completedCount = milestones.filter((milestone) => milestone.status === 'completed').length;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Milestone Progress</CardTitle>
        {milestones.length > 0 && (
          <CardDescription>
            {completedCount} of {milestones.length} completed
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {milestones.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="No milestones yet"
            description="Milestones will appear here once this project enters active development."
          />
        ) : (
          <ul className="flex flex-col gap-4">
            {milestones.map((milestone) => (
              <li key={milestone.id} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <MilestoneStatusIcon status={milestone.status} />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                    {milestone.name}
                  </span>
                  <span className="shrink-0 text-xs font-medium text-muted-foreground">
                    {milestone.progressPercent}%
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.min(100, Math.max(0, milestone.progressPercent))}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
