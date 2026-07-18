import * as React from 'react';
import { Menu as MenuPrimitive } from '@base-ui/react/menu';

import { cn } from '@/lib/utils';

/**
 * Dropdown / Menu (design-system.md §2.8). Built on `@base-ui/react`'s Menu
 * primitive (already a project dependency, same family as `dialog.tsx`'s
 * Dialog and `switch.tsx`'s Switch) for correct keyboard operability
 * (Arrow keys to move within the menu, Escape to close, focus management)
 * out of the box, matching §5's "table row actions must be... operable via
 * keyboard (Tab to the trigger, Enter/Space to open, Arrow keys to move
 * within it, Escape to close)" requirement without hand-rolling it.
 *
 * Used for row actions in `AdminPackagesPage`/`AdminAddonsPage` in place of
 * the loose icon-button rows a couple of admin tables previously used —
 * consolidating "Edit / Activate-Deactivate / Delete" behind a single
 * trigger per §2.8's spec, rather than three separate always-visible
 * buttons.
 */
function DropdownMenu(props: MenuPrimitive.Root.Props) {
  return <MenuPrimitive.Root {...props} />;
}

const DropdownMenuTrigger = MenuPrimitive.Trigger;

function DropdownMenuContent({
  className,
  children,
  align = 'end',
  sideOffset = 4,
  ...props
}: MenuPrimitive.Popup.Props & Pick<MenuPrimitive.Positioner.Props, 'align' | 'sideOffset'>) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner align={align} sideOffset={sideOffset} className="z-50 outline-none">
        <MenuPrimitive.Popup
          className={cn(
            'min-w-[180px] rounded-md border border-border bg-card p-1 text-foreground shadow-sm outline-none transition-[transform,opacity] duration-150 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
            className,
          )}
          {...props}
        >
          {children}
        </MenuPrimitive.Popup>
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

interface DropdownMenuItemProps extends MenuPrimitive.Item.Props {
  /** Destructive items (e.g. "Delete") use `--destructive` text + tinted hover per §2.8. */
  variant?: 'default' | 'destructive';
  icon?: React.ReactNode;
}

function DropdownMenuItem({ className, variant = 'default', icon, children, ...props }: DropdownMenuItemProps) {
  return (
    <MenuPrimitive.Item
      className={cn(
        'flex h-8 cursor-pointer items-center gap-2 rounded-sm px-2 text-sm outline-none transition-colors select-none',
        'data-[highlighted]:bg-muted',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-40',
        variant === 'destructive' && 'text-destructive data-[highlighted]:bg-destructive/10',
        className,
      )}
      {...props}
    >
      {icon && (
        <span className="flex size-4 shrink-0 items-center justify-center" aria-hidden="true">
          {icon}
        </span>
      )}
      {children}
    </MenuPrimitive.Item>
  );
}

function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<'div'>) {
  return <div role="separator" className={cn('my-1 h-px bg-border', className)} {...props} />;
}

export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator };
