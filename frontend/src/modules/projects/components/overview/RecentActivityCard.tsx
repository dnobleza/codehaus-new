import { Activity } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/shared/components/common/EmptyState';
import type { ProjectActivityItem } from '@/shared/types/projectOverview.types';
import { ActivityFeedList } from './ActivityFeedList';

interface RecentActivityCardProps {
  activity: ProjectActivityItem[];
  onViewAll: () => void;
}

/**
 * "Recent Activity" card (Overview tab grid position 4): the ~5-row
 * `recentActivity` preview from the overview payload, with a "View All"
 * action that switches the parent Tabs to the Activity tab (no navigation —
 * `onViewAll` is `ProjectDetailPage`'s tab-state setter).
 */
export function RecentActivityCard({ activity, onViewAll }: RecentActivityCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardAction>
          <Button variant="link" size="sm" className="h-auto px-0" onClick={onViewAll}>
            View All
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {activity.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No activity yet"
            description="Updates about this project will show up here."
          />
        ) : (
          <ActivityFeedList items={activity} />
        )}
      </CardContent>
    </Card>
  );
}
