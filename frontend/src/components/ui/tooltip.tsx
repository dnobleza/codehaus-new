import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';

import { cn } from '@/lib/utils';

/**
 * Tooltip (new — not previously specced in design-system.md, but required
 * for the "coming soon" hints on the Project Overview header's disabled
 * actions). Built on `@base-ui/react`'s Tooltip primitive, same family/
 * pattern as `dialog.tsx`/`dropdown-menu.tsx`. Visual treatment borrows the
 * Dropdown/Menu popup's tokens (`--card` surface, `--border`, `shadow-sm`,
 * `radius-md`) for consistency with the rest of the floating-surface set.
 */
function Tooltip(props: TooltipPrimitive.Root.Props) {
  return <TooltipPrimitive.Root {...props} />;
}

const TooltipTrigger = TooltipPrimitive.Trigger;

function TooltipContent({
  className,
  children,
  side = 'top',
  sideOffset = 6,
  ...props
}: TooltipPrimitive.Popup.Props & Pick<TooltipPrimitive.Positioner.Props, 'side' | 'sideOffset'>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        className="z-50 outline-none"
      >
        <TooltipPrimitive.Popup
          className={cn(
            'max-w-[220px] rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-foreground shadow-sm transition-[transform,opacity] duration-150 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
            className,
          )}
          {...props}
        >
          {children}
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent };
