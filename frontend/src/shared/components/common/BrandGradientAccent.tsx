import { cn } from '@/lib/utils';

interface BrandGradientAccentProps {
  /**
   * Positioning/sizing/rounding classes for the accent's own bounding box
   * (e.g. `inset-0 -z-10` for a full-bleed layout background, or a bounded
   * `inset-x-0 top-0 h-[34rem] rounded-b-[3rem] ring-1 ring-primary/10` panel
   * like the marketing Hero). The component only supplies `absolute
   * overflow-hidden` itself so every caller stays in control of placement.
   */
  className?: string;
  /**
   * `"strong"` is the original marketing Hero treatment. Data-dense surfaces
   * (auth card, dashboard shell) should use the default `"subtle"` variant,
   * which roughly halves every opacity value so the effect reads as a faint
   * ambient tint rather than a visible design feature competing with content.
   */
  intensity?: 'strong' | 'subtle';
}

/**
 * Reusable 3-layer brand-blue gradient/glass accent: a linear tint, a radial
 * glass highlight, and a faint diagonal stripe texture, all built from the
 * `--color-primary` design token. Purely decorative — always `aria-hidden`
 * and `pointer-events-none` — and relies on the caller's positioning classes
 * (typically a negative z-index) to stay behind real content.
 *
 * Originally introduced for the landing page Hero; also used behind
 * `AuthLayout` and `DashboardShell` at a toned-down `intensity` so the brand
 * treatment is consistent app-wide without duplicating this markup.
 */
export function BrandGradientAccent({ className, intensity = 'subtle' }: BrandGradientAccentProps) {
  const isStrong = intensity === 'strong';

  return (
    <div aria-hidden="true" className={cn('pointer-events-none absolute overflow-hidden', className)}>
      {/* Linear gradient: lighter to darker tint of brand blue */}
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-b to-transparent',
          isStrong ? 'from-primary/15 via-primary/6' : 'from-primary/8 via-primary/3',
        )}
      />
      {/* Radial highlight overlay for glass-like depth */}
      <div
        className={cn(
          'absolute inset-0',
          isStrong
            ? 'bg-[radial-gradient(circle_at_50%_-10%,color-mix(in_oklch,var(--color-primary),transparent_70%),transparent_60%)]'
            : 'bg-[radial-gradient(circle_at_50%_-10%,color-mix(in_oklch,var(--color-primary),transparent_88%),transparent_60%)]',
        )}
      />
      {/* Subtle diagonal repeating-stripe texture */}
      <div
        className={cn(
          'absolute inset-0 [background-image:repeating-linear-gradient(45deg,var(--color-primary)_0,var(--color-primary)_1px,transparent_1px,transparent_14px)]',
          isStrong ? 'opacity-[0.05]' : 'opacity-[0.025]',
        )}
      />
    </div>
  );
}
