import { Tabs as TabsPrimitive } from '@base-ui/react/tabs';

import { cn } from '@/lib/utils';

/**
 * Tabs (design-system.md §2.13). Built on `@base-ui/react`'s Tabs primitive
 * (same family as `dialog.tsx`/`switch.tsx`/`dropdown-menu.tsx`) for Arrow-
 * key navigation between tabs and correct `tablist`/`tab`/`tabpanel` ARIA
 * wiring out of the box (§5's keyboard nav requirement), rather than
 * hand-rolling tab state + roving tabindex.
 *
 * Inactive panels aren't mounted (Base UI's default `keepMounted={false}`),
 * so a panel's data-fetching hooks only run once its tab has actually been
 * visited — the Activity tab's full paginated feed, for example, never
 * fetches until the user clicks into it.
 */
function Tabs(props: TabsPrimitive.Root.Props) {
  return <TabsPrimitive.Root {...props} />;
}

function TabsList({ className, ...props }: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      className={cn('flex h-10 items-center overflow-x-auto border-b border-border', className)}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      className={cn(
        'inline-flex h-10 shrink-0 items-center whitespace-nowrap border-b-2 border-transparent px-4 text-sm font-medium text-muted-foreground outline-none transition-colors select-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 data-[active]:border-primary data-[active]:text-primary',
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return <TabsPrimitive.Panel className={cn('outline-none', className)} {...props} />;
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
