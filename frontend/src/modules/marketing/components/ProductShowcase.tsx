import { useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from 'framer-motion';
import { ArrowUpRight, CheckCircle2, Receipt, TrendingUp, UserPlus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { GlowOrb } from '@/shared/components/common/GlowOrb';
import { LaptopScreen } from './LaptopScreen';

interface FloatingWidget {
  icon: LucideIcon;
  label: string;
  value: string;
  tone: 'primary' | 'success' | 'accent';
  className: string;
  /** Stagger delay (also entrance delay multiplier) — keeps corners offset. */
  floatDelay: number;
  /** Ambient float loop duration, seconds — distinct per widget so no two sync up. */
  floatDuration: number;
  /** Ambient rotate keyframe range, degrees. */
  rotateRange: [number, number];
  /** Ambient horizontal drift, px. */
  xDrift: number;
  /** How far this card drifts under mouse parallax, px — "further" layers move more. */
  parallaxIntensity: number;
}

const WIDGETS: FloatingWidget[] = [
  {
    icon: TrendingUp,
    label: 'Revenue',
    value: '+18% this month',
    tone: 'success',
    className: '-top-6 -left-6 hidden sm:flex',
    floatDelay: 0,
    floatDuration: 6.2,
    rotateRange: [-3, 3],
    xDrift: 6,
    parallaxIntensity: 10,
  },
  {
    icon: Receipt,
    label: 'Invoice #1042',
    value: 'Paid',
    tone: 'primary',
    className: '-top-4 -right-6 sm:-right-10',
    floatDelay: 0.6,
    floatDuration: 5.4,
    rotateRange: [-2, 2],
    xDrift: -5,
    parallaxIntensity: 16,
  },
  {
    icon: UserPlus,
    label: 'New client',
    value: 'Nimbus Labs',
    tone: 'accent',
    className: '-bottom-8 -left-8 hidden md:flex',
    floatDelay: 1.1,
    floatDuration: 7,
    rotateRange: [-4, 4],
    xDrift: 8,
    parallaxIntensity: 8,
  },
  {
    icon: CheckCircle2,
    label: 'Project approved',
    value: 'Storefront revamp',
    tone: 'success',
    className: '-bottom-10 -right-4 sm:-right-8',
    floatDelay: 1.6,
    floatDuration: 5.8,
    rotateRange: [-2.5, 2.5],
    xDrift: -7,
    parallaxIntensity: 20,
  },
];

const TONE_CLASS: Record<FloatingWidget['tone'], string> = {
  primary: 'bg-primary/10 text-primary-text',
  success: 'bg-success/10 text-success',
  accent: 'bg-accent/10 text-accent',
};

/** Shared spring config for every pointer-driven parallax value. */
const PARALLAX_SPRING = { stiffness: 150, damping: 20, mass: 0.4 };

interface FloatingWidgetCardProps {
  widget: FloatingWidget;
  smoothPointerX: MotionValue<number>;
  prefersReducedMotion: boolean;
}

/**
 * One floating glassmorphism widget card. Split into its own component (not
 * inlined in a `.map()`) because it needs its own `useTransform` hook per
 * instance — calling hooks inside a loop body would violate rules-of-hooks.
 *
 * Two independent motion layers compose without fighting each other:
 * the outer layer owns position + one-shot scroll entrance (`whileInView`,
 * `opacity`/`y`) plus the pointer-parallax `x` offset (a `style` motion
 * value); the inner layer owns the infinite ambient float/rotate/drift loop
 * (`animate`, `y`/`rotate`/`x`). Because these are separate elements, their
 * transforms compose naturally instead of colliding on the same property.
 */
function FloatingWidgetCard({
  widget,
  smoothPointerX,
  prefersReducedMotion,
}: FloatingWidgetCardProps) {
  const parallaxX = useTransform(
    smoothPointerX,
    [-0.5, 0.5],
    [-widget.parallaxIntensity, widget.parallaxIntensity],
  );

  const ambientAnimate = prefersReducedMotion
    ? undefined
    : {
        y: [0, -14, 0],
        x: [0, widget.xDrift, 0],
        rotate: [widget.rotateRange[0], widget.rotateRange[1], widget.rotateRange[0]],
      };

  return (
    <motion.div
      style={prefersReducedMotion ? undefined : { x: parallaxX, willChange: 'transform' }}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.6, delay: 0.6 + widget.floatDelay * 0.15, ease: [0.16, 1, 0.3, 1] }}
      className={`glass-panel glass-clay absolute z-10 items-center gap-2.5 rounded-2xl p-3.5 ${widget.className}`}
    >
      <motion.div
        animate={ambientAnimate}
        transition={
          ambientAnimate && {
            duration: widget.floatDuration,
            delay: widget.floatDelay,
            repeat: Infinity,
            ease: 'easeInOut',
          }
        }
        className="flex items-center gap-2.5 will-change-transform"
      >
        <span
          className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${TONE_CLASS[widget.tone]}`}
        >
          <widget.icon className="size-4" aria-hidden="true" />
        </span>
        <div className="flex flex-col">
          <p className="text-mock text-muted-foreground">{widget.label}</p>
          <p className="flex items-center gap-0.5 text-xs font-semibold text-foreground">
            {widget.value}
            {widget.tone === 'success' && (
              <ArrowUpRight className="size-3 text-success" aria-hidden="true" />
            )}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

/**
 * Premium hero product showcase: a laptop mockup framing a mocked CodeHaus
 * dashboard (see `LaptopScreen`), surrounded by floating glassmorphism widget
 * cards. See design-system.md §7.19 for the full interactive spec. Purely
 * presentational — all data is mock content, not a live dashboard.
 *
 * Mouse parallax + the laptop's continuous ambient float are two separate,
 * nested Framer Motion layers so they compose instead of overriding one
 * another (each layer only ever drives properties the other doesn't touch).
 */
export function ProductShowcase() {
  const prefersReducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);

  // Pointer position, normalized to roughly [-0.5, 0.5] across the showcase.
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const smoothPointerX = useSpring(pointerX, PARALLAX_SPRING);
  const smoothPointerY = useSpring(pointerY, PARALLAX_SPRING);
  const laptopScale = useSpring(1, PARALLAX_SPRING);

  const laptopRotateY = useTransform(smoothPointerX, [-0.5, 0.5], [-8, 8]);
  const laptopRotateX = useTransform(smoothPointerY, [-0.5, 0.5], [6, -6]);

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (prefersReducedMotion || event.pointerType !== 'mouse') return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    pointerX.set((event.clientX - rect.left) / rect.width - 0.5);
    pointerY.set((event.clientY - rect.top) / rect.height - 0.5);
  };

  const handlePointerEnter = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (prefersReducedMotion || event.pointerType !== 'mouse') return;
    laptopScale.set(1.035);
  };

  const handlePointerLeave = () => {
    pointerX.set(0);
    pointerY.set(0);
    laptopScale.set(1);
  };

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      className="relative mx-auto w-full max-w-xl px-6 pt-4 pb-10 -mb-20 sm:pb-14 sm:-mb-28 lg:-mb-32"
    >
      <motion.div
        initial={{ opacity: 0.5, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 1.1, ease: 'easeOut' }}
        className="absolute -top-10 left-1/2 size-64 -translate-x-1/2"
      >
        <GlowOrb color="primary" className="inset-0 size-full" />
      </motion.div>
      <motion.div
        initial={{ opacity: 0.5, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 1.1, delay: 0.15, ease: 'easeOut' }}
        className="absolute -right-10 bottom-0 size-48"
      >
        <GlowOrb color="accent" className="inset-0 size-full" />
      </motion.div>

      {/* Laptop mockup — layered: perspective context > base 3/4 angle > pointer parallax > scroll entrance > ambient float */}
      <div className="relative" style={{ perspective: 1400 }}>
        <div
          className="[transform-style:preserve-3d]"
          style={{ transform: 'rotateY(24deg) rotateX(8deg)' }}
        >
          <motion.div
            style={
              prefersReducedMotion
                ? undefined
                : {
                    rotateY: laptopRotateY,
                    rotateX: laptopRotateX,
                    scale: laptopScale,
                    willChange: 'transform',
                  }
            }
            className="[transform-style:preserve-3d]"
          >
            <motion.div
              initial={{ opacity: 0, y: 32, scale: 0.97, rotate: -3 }}
              whileInView={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="[transform-style:preserve-3d]"
            >
              <motion.div
                animate={
                  prefersReducedMotion
                    ? undefined
                    : { y: [-4, -18, -4], rotate: [-4, 4, -4], rotateX: [3, -3, 3] }
                }
                transition={
                  prefersReducedMotion
                    ? undefined
                    : { duration: 8, repeat: Infinity, ease: 'easeInOut' }
                }
                className="relative will-change-transform"
              >
                {/* Screen bezel */}
                <div className="rounded-t-2xl border border-brand-ink bg-brand-ink p-2 shadow-2xl transition-shadow duration-300 hover:shadow-[0_30px_60px_-15px_rgba(100,80,60,0.45)] sm:p-3">
                  {/* Browser chrome */}
                  <div className="flex items-center gap-1.5 px-1.5 pb-2">
                    <span className="size-2 rounded-full bg-white/25" />
                    <span className="size-2 rounded-full bg-white/25" />
                    <span className="size-2 rounded-full bg-white/25" />
                    <span className="ml-3 hidden rounded-full bg-white/10 px-3 py-0.5 text-mock text-white/50 sm:inline-block">
                      app.codehaus.dev/dashboard
                    </span>
                  </div>

                  {/* Screen content: dashboard ⇄ logo cross-fade cycle */}
                  <LaptopScreen />
                </div>

                {/* Laptop base/hinge */}
                <div className="mx-auto h-3 w-[104%] max-w-none -translate-x-[2%] rounded-b-xl bg-gradient-to-b from-brand-ink to-brand-ink/70 shadow-lg" />
                <div className="mx-auto h-1.5 w-1/3 rounded-b-md bg-brand-ink/40" />
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Floating glassmorphism widgets */}
      {WIDGETS.map((widget) => (
        <FloatingWidgetCard
          key={widget.label}
          widget={widget}
          smoothPointerX={smoothPointerX}
          prefersReducedMotion={Boolean(prefersReducedMotion)}
        />
      ))}
    </div>
  );
}
