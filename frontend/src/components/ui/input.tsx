import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const inputVariants = cva(
  'flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground hover:border-border focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 disabled:bg-muted aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20',
  {
    variants: {
      inputSize: {
        default: 'h-8',
        lg: 'h-9',
      },
    },
    defaultVariants: {
      inputSize: 'default',
    },
  },
);

export interface InputProps
  extends Omit<React.ComponentProps<'input'>, 'size'>,
    VariantProps<typeof inputVariants> {
  label?: string;
  helperText?: string;
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, inputSize, id, label, helperText, error, ...props }, ref) => {
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
        <input
          id={inputId}
          data-slot="input"
          ref={ref}
          className={cn(inputVariants({ inputSize, className }))}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error || helperText ? helperId : undefined}
          {...props}
        />
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
