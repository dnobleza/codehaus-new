import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { PackagePage, PackageFeature } from '@/shared/types/package.types';

interface PackageItemListProps {
  title: string;
  emptyMessage: string;
  items: (PackagePage | PackageFeature)[];
  onAdd: (name: string) => void;
  onRemove: (id: string) => void;
  isMutating?: boolean;
  placeholder: string;
}

/**
 * Simple add/remove text-item list, shared by "Configure Included Pages"
 * and "Configure Included Features" (same shape: `{ id, name, displayOrder }`,
 * same interaction — a free-text input + Add button, and a trash icon per
 * row). One component instead of two near-identical ones per the DRY
 * principle in CLAUDE.md.
 */
export function PackageItemList({
  title,
  emptyMessage,
  items,
  onAdd,
  onRemove,
  isMutating,
  placeholder,
}: PackageItemListProps) {
  const [draft, setDraft] = useState('');

  function handleAdd() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setDraft('');
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-foreground">{title}</p>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-1.5 text-sm"
            >
              <span className="text-foreground">{item.name}</span>
              <button
                type="button"
                aria-label={`Remove ${item.name}`}
                onClick={() => onRemove(item.id)}
                disabled={isMutating}
                className="inline-flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:pointer-events-none disabled:opacity-50"
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-end gap-2">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              handleAdd();
            }
          }}
          placeholder={placeholder}
          aria-label={placeholder}
          className="flex-1"
        />
        <Button type="button" variant="outline" onClick={handleAdd} disabled={isMutating || !draft.trim()}>
          <Plus className="size-4" aria-hidden="true" />
          Add
        </Button>
      </div>
    </div>
  );
}
