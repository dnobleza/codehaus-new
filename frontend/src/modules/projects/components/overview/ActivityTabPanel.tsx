import { Activity } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/shared/components/common/EmptyState';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { LoadingSpinner } from '@/shared/components/common/LoadingSpinner';
import { useProjectActivity } from '../../api/projects.queries';
import { ActivityFeedList } from './ActivityFeedList';

interface ActivityTabPanelProps {
  projectId: string;
}

/**
 * Activity tab: the full paginated activity feed (distinct from the
 * Overview tab's ~5-row preview), using `nextCursor`/`before` pagination
 * via `useProjectActivity`'s `useInfiniteQuery`.
 */
export function ActivityTabPanel({ projectId }: ActivityTabPanelProps) {
  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useProjectActivity(projectId);

  const items = data?.pages.flatMap((page) => page.activity) ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingSpinner label="Loading activity..." />
        ) : isError ? (
          <ErrorState description="We couldn't load the activity feed." onRetry={() => refetch()} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No activity yet"
            description="Updates about this project will show up here."
          />
        ) : (
          <div className="flex flex-col gap-6">
            <ActivityFeedList items={items} />
            {hasNextPage && (
              <Button
                variant="outline"
                className="self-center"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? 'Loading...' : 'Load more'}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
