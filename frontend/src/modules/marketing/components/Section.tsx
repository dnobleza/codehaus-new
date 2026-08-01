import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

/**
 * A landing page section band. Owns only the shared rhythm — the vertical
 * padding scale from design-system.md §7 (`py-24 sm:py-32`) and the
 * `relative` positioning that every section's `BrandGradientAccent` is
 * absolutely positioned against.
 *
 * Backgrounds and decorative layers stay with the individual sections: the
 * wrapper standardizes rhythm, not decoration. Anchor offset for the sticky
 * header is handled globally by `scroll-padding-top` in `index.css`, so
 * nothing is needed here.
 */
export function Section({ className, ...props }: ComponentProps<'section'>) {
  return <section className={cn('relative py-24 sm:py-32', className)} {...props} />;
}
