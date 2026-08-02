import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const inputVariants = cva(
  // Clay field: pressed-in inset over a warm surface rather than a hard
  // outline (design-system.md §7.20). The border is kept (transparent) so
  // focus/invalid states can still colour it without shifting layout. The fill
  // itself lives in the `tone` variant.
  'flex w-full rounded-xl border border-transparent px-3 py-2 text-sm text-foreground clay-depth-press outline-none transition-all placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 disabled:bg-muted aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20',
  {
    variants: {
      inputSize: {
        default: 'h-8',
        lg: 'h-9',
        // Comfortable standalone-form footprint (auth, single-purpose forms),
        // where fields are the page's primary target rather than one control
        // among many in a dense dashboard panel.
        xl: 'h-11 rounded-xl px-3.5',
      },
      /**
       * Field fill. `default` is the warm clay surface used everywhere in the
       * product. `cool` swaps in the palette's cool glass tint (`--accent`),
       * which is what makes a field read as an inviting, water-clear input on
       * the otherwise all-warm auth page. Size and tone stay separate variants
       * so neither implies the other.
       */
      tone: {
        default: 'bg-secondary/50',
        cool: 'bg-accent/70',
      },
    },
    defaultVariants: {
      inputSize: 'default',
      tone: 'default',
    },
  },
);

export interface InputProps
  extends Omit<React.ComponentProps<'input'>, 'size'>, VariantProps<typeof inputVariants> {
  label?: string;
  helperText?: string;
  error?: string;
  /**
   * Decorative leading glyph (a lucide icon). Purely a scanning aid — the
   * `label` still carries the meaning — so it is `aria-hidden` and the field
   * gains left padding to clear it.
   */
  startIcon?: React.ReactNode;
  /**
   * Interactive trailing control, e.g. the password visibility toggle. Unlike
   * `startIcon` this is NOT hidden from assistive tech: it is expected to be a
   * real, labelled button.
   */
  endAdornment?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    { className, inputSize, tone, id, label, helperText, error, startIcon, endAdornment, ...props },
    ref,
  ) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    const helperId = `${inputId}-helper`;

    return (
      <div className="flex w-full flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <div className="relative">
          {startIcon && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground [&_svg]:size-4"
            >
              {startIcon}
            </span>
          )}
          <input
            id={inputId}
            data-slot="input"
            ref={ref}
            className={cn(
              inputVariants({ inputSize, tone }),
              startIcon && 'pl-9',
              endAdornment && 'pr-10',
              className,
            )}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={error || helperText ? helperId : undefined}
            {...props}
          />
          {endAdornment && (
            <span className="absolute inset-y-0 right-1.5 flex items-center">{endAdornment}</span>
          )}
        </div>
        {(error || helperText) && (
          <p
            id={helperId}
            className={cn('text-xs', error ? 'text-destructive' : 'text-muted-foreground')}
          >
            {error ?? helperText}
          </p>
        )}
      </div>
    );
  },
);
Input.displayName = 'Input';

export { Input, inputVariants };
