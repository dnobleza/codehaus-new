import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

/**
 * Elements `ScrollReveal` can render as. Deliberately narrow — this exists so
 * a reveal inside an `<ol>`/`<ul>` can BE the `<li>` rather than wrapping one
 * in a `<div>`, which would break the list's semantics for screen readers.
 */
type RevealElement = 'div' | 'li';

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  /** Rendered element. Use `li` when the reveal is a direct child of a list. */
  as?: RevealElement;
}

const ELEMENTS = {
  div: motion.div,
  li: motion.li,
} as const;

/**
 * Tasteful Apple-style scroll reveal: fade + small translate-up, triggered
 * once when the element enters the viewport. Used across marketing sections
 * only — promote to shared/components if a dashboard module needs it later.
 *
 * No `useReducedMotion()` gate by design: design-system.md §7.19 suppresses
 * infinite and auto-cycling motion under reduced motion but keeps one-shot
 * entrances.
 */
export function ScrollReveal({ children, className, delay = 0, as = 'div' }: ScrollRevealProps) {
  const Component = ELEMENTS[as];

  return (
    <Component
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </Component>
  );
}
