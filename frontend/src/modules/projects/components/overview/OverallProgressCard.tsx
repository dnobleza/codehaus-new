import { Rocket } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/shared/components/common/EmptyState';
import { formatShortDate } from '@/shared/utils/dateOnly';
import type { ProjectOverview } from '@/shared/types/projectOverview.types';
import { ProgressRing } from './ProgressRing';

interface OverallProgressCardProps {
  overview: ProjectOverview;
}

function formatDaysLeft(daysLeft: number): string {
  if (daysLeft > 0) return `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`;
  if (daysLeft === 0) return 'due today';
  const overdueBy = Math.abs(daysLeft);
  return `overdue by ${overdueBy} day${overdueBy === 1 ? '' : 's'}`;
}

/**
 * "Overall Progress" card (Overview tab, grid position 1): ring + bar +
 * estimated completion. Handles the two edge cases the backend explicitly
 * flagged: zero milestones (project hasn't reached active development —
 * shown as an empty state, not a misleading 0% ring), and milestones
 * present but no `endDate` set on any of them yet (estimated completion
 * shown as "Not yet scheduled" rather than crashing on a null date).
 */
export function OverallProgressCard({ overview }: OverallProgressCardProps) {
  const { overallProgressPercent, estimatedCompletionDate, daysLeft, milestones } = overview;
  const hasStarted = milestones.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Overall Progress</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasStarted ? (
          <EmptyState
            icon={Rocket}
            title="Not started yet"
            description="This project hasn't entered active development. Progress will appear here once work begins."
          />
        ) : (
          <div className="flex flex-col items-center gap-6">
            <ProgressRing percent={overallProgressPercent} />

            <div className="w-full">
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, overallProgressPercent))}%` }}
                />
              </div>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              {estimatedCompletionDate ? (
                <>
                  Estimated Completion:{' '}
                  <span className="font-medium text-foreground">
                    {formatShortDate(estimatedCompletionDate)}
                  </span>
                  {daysLeft !== null && <> ({formatDaysLeft(daysLeft)})</>}
                </>
              ) : (
                'Estimated Completion: Not yet scheduled'
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
