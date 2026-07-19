import type { ProjectOverview } from '@/shared/types/projectOverview.types';
import { MilestoneProgressCard } from './MilestoneProgressCard';
import { OverallProgressCard } from './OverallProgressCard';
import { ProjectTimelineCard } from './ProjectTimelineCard';
import { RecentActivityCard } from './RecentActivityCard';

interface OverviewTabPanelProps {
  overview: ProjectOverview;
  onViewAllActivity: () => void;
}

/**
 * Overview tab: the 2x2 card grid (design-system.md §1.4/§4 responsive
 * rule — collapses to a single column below the `sm` breakpoint).
 */
export function OverviewTabPanel({ overview, onViewAllActivity }: OverviewTabPanelProps) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      <OverallProgressCard overview={overview} />
      <MilestoneProgressCard milestones={overview.milestones} />
      <ProjectTimelineCard milestones={overview.milestones} />
      <RecentActivityCard activity={overview.recentActivity} onViewAll={onViewAllActivity} />
    </div>
  );
}
