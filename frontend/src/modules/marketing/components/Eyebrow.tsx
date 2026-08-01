import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

/**
 * The eyebrow pill's styles, exported separately from the component so Hero
 * can put them on a `motion.span` for its entrance animation without forking
 * the class string. Prefer the `Eyebrow` component; reach for this constant
 * only when the element itself has to be something other than a plain span.
 */
export const EYEBROW_CLASS =
  'inline-flex items-center rounded-full border border-primary/40 bg-primary/20 px-4 py-1.5 text-xs font-semibold text-foreground clay-depth-press';

/**
 * Small clay-pressed label above a section heading (design-system.md §7, the
 * eyebrow-pill convention every landing section shares). Kept as a component
 * so the six sections that use it cannot drift apart again.
 */
export function Eyebrow({ className, ...props }: ComponentProps<'span'>) {
  return <span className={cn(EYEBROW_CLASS, className)} {...props} />;
}
