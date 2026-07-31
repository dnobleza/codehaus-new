import { cn } from '@/lib/utils';

interface GlowOrbProps {
  /**
   * Positioning/sizing classes for the orb (e.g. `-top-24 -left-24 size-72`).
   * The component only supplies `absolute rounded-full blur-3xl` itself, so
   * every caller stays in control of placement and size.
   */
  className?: string;
  /** Which brand color the blurred circle is tinted with. */
  color?: 'primary' | 'accent' | 'success';
}

const COLOR_CLASS: Record<NonNullable<GlowOrbProps['color']>, string> = {
  primary: 'bg-primary/20',
  accent: 'bg-accent/20',
  success: 'bg-success/15',
};

/**
 * Single blurred, softly glowing color circle — the "floating light" look
 * used behind the Hero product showcase, Workflow section, and closing CTA
 * (design-system.md §7.11). Deliberately simple and single-purpose: for a
 * layered full-section wash, use `BrandGradientAccent` instead; for one or
 * two ambient light blobs positioned freely within a section, use this.
 * Purely decorative — always `aria-hidden` and `pointer-events-none`.
 */
export function GlowOrb({ className, color = 'primary' }: GlowOrbProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute rounded-full blur-3xl',
        COLOR_CLASS[color],
        className,
      )}
    />
  );
}
