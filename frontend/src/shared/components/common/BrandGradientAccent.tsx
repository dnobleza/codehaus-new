import { cn } from '@/lib/utils';

type GradientLayer = 'linear' | 'radial' | 'stripe';

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
   * `"whisper"` roughly halves `subtle` again, for full-bleed washes behind
   * an entire section's background (landing Services/About/Footer) where
   * even `subtle` would be too visible over a sustained scroll distance.
   */
  intensity?: 'strong' | 'subtle' | 'whisper';
  /**
   * Which of the three decorative layers to render. Defaults to all three
   * (`['linear', 'radial', 'stripe']`) for `strong`/`subtle`, matching the
   * existing behavior, and to `['linear', 'radial']` for `whisper` (the
   * diagonal stripe reads as noise at whisper opacity over large areas).
   * Callers can also opt into a single layer — e.g. `['radial']` for a
   * bounded ambient glow behind a card — without pulling in the others.
   */
  layers?: GradientLayer[];
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
export function BrandGradientAccent({ className, intensity = 'subtle', layers }: BrandGradientAccentProps) {
  const isStrong = intensity === 'strong';
  const isWhisper = intensity === 'whisper';

  const activeLayers = layers ?? (isWhisper ? ['linear', 'radial'] : ['linear', 'radial', 'stripe']);

  return (
    <div aria-hidden="true" className={cn('pointer-events-none absolute overflow-hidden', className)}>
      {/* Linear gradient: lighter to darker tint of brand blue */}
      {activeLayers.includes('linear') && (
        <div
          className={cn(
            'absolute inset-0 bg-gradient-to-b to-transparent',
            isWhisper
              ? 'from-primary/[0.04] via-primary/[0.015]'
              : isStrong
                ? 'from-primary/15 via-primary/6'
                : 'from-primary/8 via-primary/3',
          )}
        />
      )}
      {/* Radial highlight overlay for glass-like depth */}
      {activeLayers.includes('radial') && (
        <div
          className={cn(
            'absolute inset-0',
            isWhisper
              ? 'bg-[radial-gradient(circle_at_50%_-10%,color-mix(in_oklch,var(--color-primary),transparent_94%),transparent_60%)]'
              : isStrong
                ? 'bg-[radial-gradient(circle_at_50%_-10%,color-mix(in_oklch,var(--color-primary),transparent_70%),transparent_60%)]'
                : 'bg-[radial-gradient(circle_at_50%_-10%,color-mix(in_oklch,var(--color-primary),transparent_88%),transparent_60%)]',
          )}
        />
      )}
      {/* Subtle diagonal repeating-stripe texture */}
      {activeLayers.includes('stripe') && (
        <div
          className={cn(
            'absolute inset-0 [background-image:repeating-linear-gradient(45deg,var(--color-primary)_0,var(--color-primary)_1px,transparent_1px,transparent_14px)]',
            isWhisper ? 'opacity-[0.012]' : isStrong ? 'opacity-[0.05]' : 'opacity-[0.025]',
          )}
        />
      )}
    </div>
  );
}
