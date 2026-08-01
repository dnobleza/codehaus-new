import { motion, useReducedMotion } from 'framer-motion';

import { GlowOrb } from '@/shared/components/common/GlowOrb';

interface Speck {
  top: string;
  left: string;
  size: number;
  duration: number;
  delay: number;
  driftX: number;
  driftY: number;
}

/**
 * Sparse, low-opacity light specks drifting slowly and independently behind
 * the Hero. Deliberately small in count (per the perf budget) and purely
 * decorative — `aria-hidden`, `pointer-events-none`, transform/opacity only.
 */
const SPECKS: Speck[] = [
  { top: '12%', left: '8%', size: 3, duration: 14, delay: 0, driftX: 18, driftY: -22 },
  { top: '22%', left: '82%', size: 2, duration: 11, delay: 1.2, driftX: -14, driftY: 16 },
  { top: '38%', left: '18%', size: 2.5, duration: 16, delay: 2.4, driftX: 10, driftY: 20 },
  { top: '55%', left: '92%', size: 3, duration: 13, delay: 0.6, driftX: -20, driftY: -12 },
  { top: '68%', left: '6%', size: 2, duration: 15, delay: 3, driftX: 16, driftY: 14 },
  { top: '15%', left: '48%', size: 2.5, duration: 12, delay: 1.8, driftX: -12, driftY: 18 },
  { top: '78%', left: '35%', size: 3, duration: 17, delay: 0.9, driftX: 14, driftY: -16 },
  { top: '45%', left: '65%', size: 2, duration: 10, delay: 2.6, driftX: -18, driftY: -10 },
  { top: '30%', left: '30%', size: 2.5, duration: 18, delay: 1.4, driftX: 12, driftY: 12 },
];

/**
 * Ambient background layer for the Hero: extends (does not replace)
 * `BrandGradientAccent`/`GlowOrb` with a slow-drifting glow and a sparse
 * speck layer for extra depth (design-system.md §7.19). Always stays behind
 * content (`-z-10`, rendered inside a `pointer-events-none` wrapper) and
 * never reduces text/CTA contrast. Fully gated by `useReducedMotion()` — the
 * drift and speck loops are skipped (static placement only) when reduced
 * motion is preferred.
 */
export function HeroBackgroundEffects() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[38rem] overflow-hidden sm:h-[42rem]"
    >
      <motion.div
        initial={{ opacity: 0.6 }}
        whileInView={{ opacity: 1, transition: { duration: 1.2, ease: 'easeOut' } }}
        viewport={{ once: true, amount: 0.4 }}
        animate={prefersReducedMotion ? undefined : { x: [0, 40, -20, 0], y: [0, -30, 20, 0] }}
        transition={
          prefersReducedMotion ? undefined : { duration: 22, repeat: Infinity, ease: 'easeInOut' }
        }
        className="absolute top-1/4 left-1/2 size-[28rem] -translate-x-1/2 will-change-transform"
      >
        <GlowOrb color="primary" className="inset-0 size-full opacity-70" />
      </motion.div>

      {SPECKS.map((speck, index) => (
        <motion.span
          key={index}
          className="absolute rounded-full bg-foreground/20"
          style={{ top: speck.top, left: speck.left, width: speck.size, height: speck.size }}
          animate={
            prefersReducedMotion
              ? undefined
              : {
                  x: [0, speck.driftX, 0],
                  y: [0, speck.driftY, 0],
                  opacity: [0.15, 0.4, 0.15],
                }
          }
          transition={
            prefersReducedMotion
              ? undefined
              : {
                  duration: speck.duration,
                  delay: speck.delay,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }
          }
        />
      ))}
    </div>
  );
}
