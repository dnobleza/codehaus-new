import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  label?: string;
  className?: string;
}

/** In-place loading indicator (design-system.md §2.16 Spinner pattern). */
export function LoadingSpinner({ label, className }: LoadingSpinnerProps) {
  return (
    <div className={cn('flex items-center justify-center gap-2 py-12 text-muted-foreground', className)}>
      <Loader2 className="size-5 animate-spin text-primary" aria-hidden="true" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}
