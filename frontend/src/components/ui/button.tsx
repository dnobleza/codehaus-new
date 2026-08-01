import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useRef, useState } from 'react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "group/button relative overflow-hidden inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // Clay CTA: moulded depth that spreads on hover and presses inward on
        // click. The label is dark (`--primary-foreground`), not white — see
        // design-system.md §1.1 contrast rules.
        default:
          'bg-primary text-primary-foreground clay-depth hover:bg-primary-hover hover:clay-depth-hover active:clay-depth-press',
        outline:
          'border-border bg-background shadow-[var(--shadow-xs)] hover:bg-muted hover:text-foreground hover:shadow-[var(--shadow-sm)] aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground',
        ghost:
          'hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50',
        destructive:
          'bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40',
        link: 'text-primary-text underline-offset-4 hover:underline',
        // Marketing CTA pair (design-system.md §7.3). `rounded-full` lives
        // inside cva so it beats the base `rounded-lg` by source order rather
        // than needing a per-call override at every call site. `hover:bg-*` is
        // pinned to the resting fill on purpose: on these buttons the hover
        // response is the clay lift, not a color shift.
        cta: 'clay-surface clay-lift rounded-full bg-primary font-semibold text-primary-foreground hover:bg-primary',
        // Glass fill, clay outline. Deliberately NOT the `glass-panel` utility:
        // that class sets `border` itself at specificity (0,2,0), which beats
        // the `border-primary/60` utility (0,1,0) in the same cascade layer and
        // silently repaints the outline in `--glass-border` — a white
        // translucent line that is invisible on cream. Composing the fill and
        // blur directly leaves the clay border as the only border rule.
        'cta-outline':
          'clay-lift rounded-full border-2 border-primary/60 bg-glass-bg font-semibold text-foreground backdrop-blur-md backdrop-saturate-150 hover:bg-glass-bg-hover',
      },
      size: {
        default:
          'h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: 'h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        icon: 'size-8',
        'icon-xs':
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        'icon-sm':
          'size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg',
        'icon-lg': 'size-9',
        // Landing page CTA footprint: tall, padding-heavy, fully rounded.
        cta: 'h-12 gap-2 rounded-full px-8 text-base has-data-[icon=inline-end]:pr-6 has-data-[icon=inline-start]:pl-6',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

interface Ripple {
  id: number;
  x: number;
  y: number;
  size: number;
}

/**
 * Click-origin ripple feedback, reusable across every `Button` variant/size.
 * Skipped entirely when the user prefers reduced motion. Each ripple is a
 * separate `motion.span` (not a CSS `@keyframes` class) so multiple rapid
 * clicks can overlap cleanly and self-remove via `onAnimationComplete`.
 */
function ButtonRipples({
  ripples,
  onRippleComplete,
}: {
  ripples: Ripple[];
  onRippleComplete: (id: number) => void;
}) {
  if (ripples.length === 0) return null;

  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
    >
      <AnimatePresence>
        {ripples.map((ripple) => (
          <motion.span
            key={ripple.id}
            initial={{ opacity: 0.35, scale: 0 }}
            animate={{ opacity: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            onAnimationComplete={() => onRippleComplete(ripple.id)}
            className="absolute rounded-full bg-current"
            style={{
              left: ripple.x - ripple.size / 2,
              top: ripple.y - ripple.size / 2,
              width: ripple.size,
              height: ripple.size,
            }}
          />
        ))}
      </AnimatePresence>
    </span>
  );
}

function Button({
  className,
  variant = 'default',
  size = 'default',
  onClick,
  children,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  const prefersReducedMotion = useReducedMotion();
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const rippleIdRef = useRef(0);

  const removeRipple = (id: number) => {
    setRipples((current) => current.filter((ripple) => ripple.id !== id));
  };

  const handleClick: NonNullable<ButtonPrimitive.Props['onClick']> = (event) => {
    if (!prefersReducedMotion) {
      const rect = event.currentTarget.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2;
      const ripple: Ripple = {
        id: rippleIdRef.current++,
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        size,
      };
      setRipples((current) => [...current, ripple]);
    }
    onClick?.(event);
  };

  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      onClick={handleClick}
      {...props}
    >
      {children}
      <ButtonRipples ripples={ripples} onRippleComplete={removeRipple} />
    </ButtonPrimitive>
  );
}

export { Button, buttonVariants };
