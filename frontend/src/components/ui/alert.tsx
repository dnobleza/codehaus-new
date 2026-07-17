import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

import { cn } from '@/lib/utils';

const alertVariants = cva(
  'flex w-full items-start gap-3 rounded-md border px-4 py-3 text-sm',
  {
    variants: {
      variant: {
        neutral: 'border-border/60 bg-muted text-foreground',
        primary: 'border-primary/30 bg-primary/8 text-primary',
        success: 'border-success/30 bg-success/8 text-success',
        warning: 'border-warning/30 bg-warning/15 text-warning-foreground-on-light',
        danger: 'border-destructive/30 bg-destructive/8 text-destructive',
        info: 'border-info/30 bg-info/8 text-info-foreground-on-light',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  },
);

const ICONS = {
  neutral: Info,
  primary: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: AlertCircle,
  info: Info,
} as const;

export interface AlertProps
  extends React.ComponentProps<'div'>,
    VariantProps<typeof alertVariants> {
  title: string;
  description?: string;
}

function Alert({ className, variant = 'neutral', title, description, ...props }: AlertProps) {
  const Icon = ICONS[variant ?? 'neutral'];

  return (
    <div role="alert" className={cn(alertVariants({ variant, className }))} {...props}>
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div className="flex flex-col">
        <p className="font-semibold leading-5">{title}</p>
        {description && <p className="mt-1 font-normal text-foreground/80">{description}</p>}
      </div>
    </div>
  );
}

export { Alert, alertVariants };
