import type { ComponentProps, ElementType } from 'react';

import { cn } from '@/lib/utils';

interface ContainerProps extends ComponentProps<'div'> {
  /** Element to render as — `div` by default. */
  as?: ElementType;
}

/**
 * The landing page's horizontal measure: centered, capped at the 1280px grid
 * (design-system.md §1.4), with the responsive page margins the grid spec
 * defines. Every marketing section reads to the same left and right edge
 * because they all go through here.
 *
 * `max-w-*` in `className` wins over the default via tailwind-merge, which is
 * how Contact narrows itself to `max-w-3xl` without forking the paddings.
 */
export function Container({ as: Component = 'div', className, ...props }: ContainerProps) {
  return (
    <Component
      className={cn('mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8', className)}
      {...props}
    />
  );
}
