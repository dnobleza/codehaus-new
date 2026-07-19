import type { LucideIcon } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/shared/components/common/EmptyState';

interface ComingSoonTabPanelProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

/**
 * Placeholder for tabs with no backing data yet (Tasks, Files) — per the
 * task brief, these are empty-state-only for now, using the design
 * system's Empty State pattern rather than a bespoke "coming soon" block.
 */
export function ComingSoonTabPanel({ icon, title, description }: ComingSoonTabPanelProps) {
  return (
    <Card>
      <CardContent>
        <EmptyState icon={icon} title={title} description={description} />
      </CardContent>
    </Card>
  );
}
