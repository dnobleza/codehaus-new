import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useEscapeKey } from '@/shared/hooks/useEscapeKey';
import codehausLogo from '@/assets/codehaus-logo.svg';
import { NAV_ITEMS } from '../constants';
import { Container } from './Container';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEscapeKey(isOpen, () => setIsOpen(false));

  /**
   * Modal-drawer housekeeping the hand-rolled panel does not get for free:
   * move focus into the drawer on open so keyboard and screen-reader users
   * land inside it rather than continuing through the page behind, return
   * focus to the toggle on close, and stop the page scrolling underneath.
   */
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    // Captured now rather than read in the cleanup: by the time cleanup runs
    // the ref may already point somewhere else.
    const toggle = toggleRef.current;

    document.body.style.overflow = 'hidden';
    drawerRef.current?.querySelector<HTMLElement>('a, button')?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      toggle?.focus();
    };
  }, [isOpen]);

  function handleNavClick() {
    setIsOpen(false);
  }

  return (
    // Glassmorphic header (§7.2): frosted translucent bar over whatever
    // scrolls beneath it, with a warm clay hairline instead of a blue one. The
    // rounded `--radius-clay` treatment is deliberately NOT applied here — a
    // full-bleed sticky bar reads better with square edges.
    <header className="sticky top-0 z-50 border-b border-glass-border bg-glass-bg shadow-[0_1px_0_0_rgba(100,80,60,0.06)] backdrop-blur-xl backdrop-saturate-150">
      <Container as="nav" aria-label="Primary" className="flex h-16 items-center justify-between">
        <a href="#home" className="flex items-center">
          {/* Fits inside the 64px bar with even space above and below. */}
          <img src={codehausLogo} alt="CodeHaus" className="h-10 w-auto" />
        </a>

        <ul className="hidden items-center gap-8 lg:flex">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                // Clay-colored underline wipe plus a soft fade-in glow on
                // hover (§7.2). The label itself darkens to `--foreground`
                // rather than turning clay — clay text on cream is ~1.9:1.
                className="relative text-sm font-medium text-muted-foreground transition-[color,text-shadow] duration-200 after:absolute after:inset-x-0 after:-bottom-1 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-primary after:transition-transform after:duration-200 hover:text-foreground hover:[text-shadow:0_0_12px_rgba(212,165,116,0.55)] hover:after:scale-x-100"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-3 lg:flex">
          <Button variant="ghost" onClick={() => navigate('/login')}>
            Log in
          </Button>
          {/* Header-scale CTA: the `cta` variant's materials at the default
              button footprint, so the bar keeps its 64px rhythm. */}
          <Button variant="cta" className="px-6 py-2" onClick={() => navigate('/register')}>
            Sign up
          </Button>
        </div>

        <button
          ref={toggleRef}
          type="button"
          className="inline-flex size-10 items-center justify-center rounded-md text-foreground lg:hidden"
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isOpen}
          aria-controls="mobile-nav-drawer"
          onClick={() => setIsOpen((prev) => !prev)}
        >
          {isOpen ? (
            <X className="size-6" aria-hidden="true" />
          ) : (
            <Menu className="size-6" aria-hidden="true" />
          )}
        </button>
      </Container>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              className="fixed inset-0 top-16 z-40 bg-foreground/50 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              id="mobile-nav-drawer"
              ref={drawerRef}
              role="dialog"
              aria-modal="true"
              aria-label="Site menu"
              className="fixed inset-x-0 top-16 z-40 h-[calc(100vh-4rem)] w-full overflow-y-auto bg-glass-bg backdrop-blur-xl backdrop-saturate-150 lg:hidden"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <ul className="flex flex-col gap-1 px-6 py-8">
                {NAV_ITEMS.map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      onClick={handleNavClick}
                      className="block rounded-2xl px-4 py-3 text-base font-medium text-foreground transition-shadow duration-200 hover:bg-secondary/60 hover:clay-depth-press"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
              {/* Same CTA materials as every other button on the page — a
                  mobile visitor should not meet a different product. */}
              <div className="flex flex-col gap-3 border-t border-border px-6 py-6">
                <Button
                  variant="cta-outline"
                  size="cta"
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/login');
                  }}
                >
                  Log in
                </Button>
                <Button
                  variant="cta"
                  size="cta"
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/register');
                  }}
                >
                  Sign up
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
