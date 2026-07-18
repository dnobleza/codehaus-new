import { Switch as SwitchPrimitive } from '@base-ui/react/switch';

import { cn } from '@/lib/utils';

/**
 * Toggle/Switch (design-system.md §3.12 spec: `--primary` fill when on,
 * `--muted` when off, `radius-full` track). New component, not previously
 * built — used here for `is_active`/`is_custom` package fields.
 */
function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full bg-muted transition-colors data-[checked]:bg-primary focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block size-4 translate-x-0.5 rounded-full bg-card shadow-xs transition-transform data-[checked]:translate-x-[18px]" />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
