import { useMemo } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatPHP } from '@/shared/utils/currency';
import type { Addon, AddonCategory } from '@/shared/types/addon.types';

const CATEGORY_ORDER: AddonCategory[] = [
  'authentication',
  'dashboard',
  'payments',
  'reports',
  'communication',
  'integrations',
];

const CATEGORY_LABELS: Record<AddonCategory, string> = {
  authentication: 'Authentication',
  dashboard: 'Dashboard',
  payments: 'Payments',
  reports: 'Reports',
  communication: 'Communication',
  integrations: 'Integrations',
};

interface AddonCatalogProps {
  addons: Addon[];
  selectedIds: Set<string>;
  onToggle: (addonId: string) => void;
}

/**
 * The "Additional Features" add-on catalog, grouped into the spec's 6
 * categories (checkbox per line item — design-system.md §3 quotation
 * builder guidance). Purely presentational: the live running total is
 * computed by the parent from `selectedIds` + these same `addons`, so
 * there's one source of truth for pricing.
 */
export function AddonCatalog({ addons, selectedIds, onToggle }: AddonCatalogProps) {
  const grouped = useMemo(() => {
    const map = new Map<AddonCategory, Addon[]>();
    for (const category of CATEGORY_ORDER) map.set(category, []);
    for (const addon of addons) {
      const bucket = map.get(addon.category);
      if (bucket) bucket.push(addon);
    }
    return map;
  }, [addons]);

  return (
    <div className="flex flex-col gap-4">
      {CATEGORY_ORDER.map((category) => {
        const items = grouped.get(category) ?? [];
        if (items.length === 0) return null;

        return (
          <Card key={category} size="sm">
            <CardHeader>
              <CardTitle className="text-sm">{CATEGORY_LABELS[category]}</CardTitle>
            </CardHeader>
            <CardContent>
              <fieldset className="flex flex-col gap-2">
                <legend className="sr-only">{CATEGORY_LABELS[category]} add-ons</legend>
                {items.map((addon) => {
                  const inputId = `addon-${addon.id}`;
                  const isChecked = selectedIds.has(addon.id);
                  return (
                    <label
                      key={addon.id}
                      htmlFor={inputId}
                      className={cn(
                        'flex cursor-pointer items-start justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm transition-colors',
                        isChecked ? 'border-primary/40 bg-primary/5' : 'hover:bg-muted',
                      )}
                    >
                      <span className="flex items-start gap-2">
                        <input
                          id={inputId}
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => onToggle(addon.id)}
                          className="mt-0.5 size-4 shrink-0 rounded border-input text-primary focus-visible:ring-3 focus-visible:ring-ring/50"
                        />
                        <span className="flex flex-col">
                          <span className="font-medium text-foreground">{addon.name}</span>
                          {addon.description && (
                            <span className="text-xs text-muted-foreground">{addon.description}</span>
                          )}
                        </span>
                      </span>
                      <span className="shrink-0 font-medium text-foreground">{formatPHP(addon.price)}</span>
                    </label>
                  );
                })}
              </fieldset>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
