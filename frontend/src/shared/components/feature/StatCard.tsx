import type { LucideIcon } from 'lucide-react';
import { TrendingDown, TrendingUp } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: { value: string; direction: 'up' | 'down' };
}

/**
 * Dashboard summary card (large numeral + label + optional trend badge),
 * per design-system.md §3.2/§3.3. Used identically by all three mock
 * dashboards, so it's promoted to shared/components/feature.
 */
export function StatCard({ label, value, icon: Icon, trend }: StatCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-5" aria-hidden="true" />
          </div>
          {trend && (
            <Badge variant={trend.direction === 'up' ? 'success' : 'danger'}>
              {trend.direction === 'up' ? (
                <TrendingUp className="size-3" aria-hidden="true" />
              ) : (
                <TrendingDown className="size-3" aria-hidden="true" />
              )}
              {trend.value}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
