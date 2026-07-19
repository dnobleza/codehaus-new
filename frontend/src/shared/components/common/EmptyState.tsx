import type { LucideIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

/**
 * No-data placeholder (design-system.md §2.15): centered icon + title +
 * description + optional CTA, used inside cards/tables/full-page contexts.
 * Reused everywhere a "no data exists yet" state is needed (project
 * Overview's zero-milestone state, the Tasks/Files tab placeholders, empty
 * activity feeds) instead of each caller hand-rolling its own block.
 */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center gap-4 py-16 text-center', className)}>
      <Icon className="size-12 text-muted-foreground" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <p className="text-base font-semibold text-foreground">{title}</p>
        {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && (
        <Button className="mt-2" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
