import * as React from 'react';

import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<React.ComponentProps<'select'>, 'size'> {
  label?: string;
  helperText?: string;
  error?: string;
}

/**
 * Native `<select>` styled to match Input (design-system.md §2.3)'s border/
 * radius/focus treatment, used for the project status filter and
 * status-change control. A native element (rather than a custom
 * `@base-ui/react/select`-based popup) is used deliberately here: it's
 * fully keyboard/screen-reader accessible out of the box, needs no
 * portal/positioning code, and every use of it in this admin surface is a
 * plain single-value "pick one" control — exactly what `<select>` is for.
 */
const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, id, label, helperText, error, children, ...props }, ref) => {
    const generatedId = React.useId();
    const selectId = id ?? generatedId;
    const helperId = `${selectId}-helper`;

    return (
      <div className="flex w-full flex-col gap-1">
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error || helperText ? helperId : undefined}
          className={cn(
            'h-8 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition-all hover:border-border focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:bg-muted disabled:opacity-50',
            error && 'border-destructive ring-3 ring-destructive/20',
            className,
          )}
          {...props}
        >
          {children}
        </select>
        {(error || helperText) && (
          <p id={helperId} className={cn('text-xs', error ? 'text-destructive' : 'text-muted-foreground')}>
            {error ?? helperText}
          </p>
        )}
      </div>
    );
  },
);
Select.displayName = 'Select';

export { Select };
