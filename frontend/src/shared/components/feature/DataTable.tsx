import type { ReactNode } from 'react';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface DataTableColumn<T> {
  header: string;
  accessor: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string | number;
  emptyMessage?: string;
}

/**
 * Generic, lightweight data table matching design-system.md §2.4 (row/header
 * heights, spacing, hover state). Reused across all three mock dashboards
 * rather than duplicating table markup per module.
 */
export function DataTable<T>({ columns, rows, getRowKey, emptyMessage }: DataTableProps<T>) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="h-10 border-b border-border text-left">
              {columns.map((column) => (
                <th
                  key={column.header}
                  scope="col"
                  className="px-4 text-xs font-semibold text-muted-foreground"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-sm text-muted-foreground"
                >
                  {emptyMessage ?? 'No data yet.'}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={getRowKey(row)}
                  className="h-11 border-b border-border last:border-0 hover:bg-muted"
                >
                  {columns.map((column) => (
                    <td
                      key={column.header}
                      className={cn('px-4 text-foreground', column.className)}
                    >
                      {column.accessor(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
