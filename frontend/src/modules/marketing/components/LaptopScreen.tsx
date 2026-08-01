import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Bell, CheckCircle2, FolderKanban, Receipt, Users } from 'lucide-react';

import { GlowOrb } from '@/shared/components/common/GlowOrb';
import codehausIcon from '@/assets/codehaus-icon.svg';

type ScreenPhase = 'dashboard' | 'transition-out' | 'logo' | 'transition-in';

/** How long the dashboard content holds before cycling to the logo beat. */
const HOLD_DASHBOARD_MS = 4800;
/** How long the logo content holds before cycling back to the dashboard. */
const HOLD_LOGO_MS = 2600;
/** Buffer matching the cross-fade transition duration between beats. */
const TRANSITION_MS = 550;

const REVENUE_BARS = [38, 52, 44, 68, 58, 80, 72];

const TASKS = [
  { label: 'Draft proposal for Nimbus Labs', done: true },
  { label: 'Review invoice #1042', done: true },
  { label: 'Client feedback: storefront revamp', done: false },
];

const DASHBOARD_VARIANTS = {
  initial: { opacity: 0, scale: 1.02 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: 'easeOut' as const } },
  exit: {
    opacity: 0,
    scale: 0.94,
    transition: { duration: 0.5, ease: 'easeInOut' as const },
  },
};

const LOGO_VARIANTS = {
  initial: { opacity: 0, scale: 0.88 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: 'easeOut' as const } },
  exit: { opacity: 0, scale: 0.92, transition: { duration: 0.4, ease: 'easeIn' as const } },
};

/**
 * Mocked CodeHaus dashboard markup: mini sidebar, stat tiles, revenue chart,
 * task list. Purely presentational mock data, not a live dashboard. Shared
 * between the animated (`DashboardContent`) and reduced-motion static paths
 * so the two never drift out of sync.
 */
function DashboardGrid() {
  return (
    <div className="grid size-full grid-cols-[3rem_1fr] overflow-hidden rounded-lg bg-card sm:grid-cols-[3.5rem_1fr]">
      {/* Mini sidebar */}
      <div className="flex flex-col items-center gap-3 border-r border-border/60 bg-secondary/40 py-4">
        <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <FolderKanban className="size-3.5" aria-hidden="true" />
        </span>
        <span className="flex size-7 items-center justify-center rounded-md text-muted-foreground">
          <Receipt className="size-3.5" aria-hidden="true" />
        </span>
        <span className="flex size-7 items-center justify-center rounded-md text-muted-foreground">
          <Users className="size-3.5" aria-hidden="true" />
        </span>
        <span className="flex size-7 items-center justify-center rounded-md text-muted-foreground">
          <Bell className="size-3.5" aria-hidden="true" />
        </span>
      </div>

      {/* Main panel */}
      <div className="flex flex-col gap-3 p-3 sm:gap-4 sm:p-4">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold text-foreground sm:text-xs">Overview</p>
          <span className="rounded-full bg-success/10 px-2 py-0.5 text-[9px] font-medium text-success sm:text-[10px]">
            Live
          </span>
        </div>

        {/* Stat tiles */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-md bg-secondary/50 p-2">
            <p className="text-[8px] text-muted-foreground sm:text-[9px]">Projects</p>
            <p className="text-xs font-bold text-foreground sm:text-sm">24</p>
          </div>
          <div className="rounded-md bg-secondary/50 p-2">
            <p className="text-[8px] text-muted-foreground sm:text-[9px]">Quotations</p>
            <p className="text-xs font-bold text-foreground sm:text-sm">12</p>
          </div>
          <div className="rounded-md bg-secondary/50 p-2">
            <p className="text-[8px] text-muted-foreground sm:text-[9px]">Revenue</p>
            <p className="text-xs font-bold text-foreground sm:text-sm">$42K</p>
          </div>
        </div>

        {/* Revenue chart */}
        <div className="flex h-14 items-end gap-1.5 rounded-md bg-secondary/30 p-2 sm:h-16">
          {REVENUE_BARS.map((height, index) => (
            <div
              key={index}
              className="flex-1 rounded-t-sm bg-gradient-to-t from-primary to-primary/40"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>

        {/* Task list */}
        <div className="flex flex-col gap-1.5">
          {TASKS.map((task) => (
            <div key={task.label} className="flex items-center gap-1.5">
              <span
                className={
                  task.done
                    ? 'flex size-3 items-center justify-center rounded-full bg-success/15 text-success'
                    : 'size-3 rounded-full border border-border'
                }
              >
                {task.done && <CheckCircle2 className="size-2.5" aria-hidden="true" />}
              </span>
              <p className="truncate text-[9px] text-muted-foreground sm:text-[10px]">
                {task.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DashboardContent() {
  return (
    <motion.div
      key="dashboard"
      variants={DASHBOARD_VARIANTS}
      initial="initial"
      animate="animate"
      exit="exit"
      className="absolute inset-0"
    >
      <DashboardGrid />
    </motion.div>
  );
}

/**
 * Centered CodeHaus icon on a soft radial glow, with a gentle breathing
 * pulse. The pulse runs on its own inner element so it never fights with the
 * outer element's cross-fade enter/exit scale (see LaptopScreen doc comment).
 */
function LogoContent() {
  return (
    <motion.div
      key="logo"
      variants={LOGO_VARIANTS}
      initial="initial"
      animate="animate"
      exit="exit"
      className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-lg bg-card"
    >
      <GlowOrb color="primary" className="inset-0 m-auto size-24 sm:size-28" />
      <motion.div
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        className="relative"
      >
        <img src={codehausIcon} alt="CodeHaus" className="relative z-10 size-12 sm:size-14" />
      </motion.div>
    </motion.div>
  );
}

/**
 * Laptop screen content: an infinite cross-fade cycle between the mocked
 * dashboard and a centered CodeHaus logo beat, driven by a small phase state
 * machine (`ScreenPhase`) rather than CSS `@keyframes`, so timing can be
 * tuned per-beat. `transition-out`/`transition-in` are short buffer phases
 * whose duration matches the cross-fade transition — see
 * design-system.md §7.19 for the full timing spec.
 *
 * The container has a fixed height (not animated — see hard perf
 * constraints) so the bezel never resizes as content cross-fades; both
 * dashboard and logo variants are absolutely positioned within it.
 *
 * Respects `useReducedMotion()`: when reduced motion is preferred, the cycle
 * never starts and the dashboard renders once, statically.
 */
export function LaptopScreen() {
  const prefersReducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<ScreenPhase>('dashboard');

  useEffect(() => {
    if (prefersReducedMotion) return undefined;

    const durations: Record<ScreenPhase, number> = {
      dashboard: HOLD_DASHBOARD_MS,
      'transition-out': TRANSITION_MS,
      logo: HOLD_LOGO_MS,
      'transition-in': TRANSITION_MS,
    };
    const next: Record<ScreenPhase, ScreenPhase> = {
      dashboard: 'transition-out',
      'transition-out': 'logo',
      logo: 'transition-in',
      'transition-in': 'dashboard',
    };

    const timeoutId = window.setTimeout(() => setPhase(next[phase]), durations[phase]);
    return () => window.clearTimeout(timeoutId);
  }, [phase, prefersReducedMotion]);

  if (prefersReducedMotion) {
    return (
      <div className="relative h-64 overflow-hidden rounded-lg bg-card sm:h-72">
        <DashboardGrid />
      </div>
    );
  }

  const showingLogo = phase === 'logo' || phase === 'transition-out';

  return (
    <div className="relative h-64 overflow-hidden rounded-lg bg-card sm:h-72">
      <AnimatePresence mode="wait" initial={false}>
        {showingLogo ? <LogoContent key="logo" /> : <DashboardContent key="dashboard" />}
      </AnimatePresence>
    </div>
  );
}
