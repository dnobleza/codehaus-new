import type { LucideIcon } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface ActivityEntry {
  id: string | number;
  icon: LucideIcon;
  title: string;
  timestamp: string;
}

interface ActivityFeedProps {
  title: string;
  entries: ActivityEntry[];
}

/** Chronological activity list widget, reused across all three mock dashboards. */
export function ActivityFeed({ title, entries }: ActivityFeedProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-4">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-start gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <entry.icon className="size-4" aria-hidden="true" />
              </div>
              <div className="flex min-w-0 flex-col">
                <p className="truncate text-sm text-foreground">{entry.title}</p>
                <p className="text-xs text-muted-foreground">{entry.timestamp}</p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
