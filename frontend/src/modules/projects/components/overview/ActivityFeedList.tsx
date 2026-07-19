import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatRelativeTime } from '@/shared/utils/relativeTime';
import type { ProjectActivityItem } from '@/shared/types/projectOverview.types';

interface ActivityFeedListProps {
  items: ProjectActivityItem[];
}

function getInitials(firstName: string, lastName: string): string {
  const first = firstName.charAt(0);
  const last = lastName.charAt(0);
  return `${first}${last}`.toUpperCase() || '?';
}

/**
 * Chronological activity list (actor avatar/initials + bold name + summary
 * text + relative timestamp), shared verbatim between the Overview tab's
 * "Recent Activity" preview and the Activity tab's full paginated feed —
 * only the data source (capped `recentActivity` vs. paginated
 * `useProjectActivity`) differs between the two callers.
 */
export function ActivityFeedList({ items }: ActivityFeedListProps) {
  return (
    <ul className="flex flex-col gap-4">
      {items.map((item) => {
        const actorName = item.actor ? `${item.actor.firstName} ${item.actor.lastName}` : 'System';

        return (
          <li key={item.id} className="flex items-start gap-3">
            <Avatar>
              <AvatarFallback>
                {item.actor ? getInitials(item.actor.firstName, item.actor.lastName) : '•'}
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="text-sm text-foreground">
                <span className="font-semibold">{actorName}</span> {item.summary}
              </p>
              <p className="text-xs text-muted-foreground">{formatRelativeTime(item.createdAt)}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
