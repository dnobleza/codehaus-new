import { Avatar as AvatarPrimitive } from '@base-ui/react/avatar';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * Avatar (design-system.md §2.10). Built on `@base-ui/react`'s Avatar
 * primitive (same family as the other `components/ui/*` primitives). Only
 * `Root`/`Fallback` are wired up — no `Image` part — because nothing in
 * this product currently has a profile-photo URL to render (the activity
 * feed's `actor` is just `{ id, firstName, lastName }`); add an `Image`
 * export here if/when a real avatar URL exists to display.
 */
const avatarVariants = cva(
  'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted font-semibold text-foreground select-none',
  {
    variants: {
      size: {
        xs: 'size-6 text-[10px]',
        sm: 'size-8 text-xs',
        md: 'size-10 text-sm',
        lg: 'size-16 text-lg',
      },
    },
    defaultVariants: {
      size: 'sm',
    },
  },
);

export interface AvatarProps
  extends AvatarPrimitive.Root.Props, VariantProps<typeof avatarVariants> {}

function Avatar({ className, size, ...props }: AvatarProps) {
  return <AvatarPrimitive.Root className={cn(avatarVariants({ size, className }))} {...props} />;
}

function AvatarFallback({ className, ...props }: AvatarPrimitive.Fallback.Props) {
  return (
    <AvatarPrimitive.Fallback
      className={cn('flex size-full items-center justify-center', className)}
      {...props}
    />
  );
}

export { Avatar, AvatarFallback };
