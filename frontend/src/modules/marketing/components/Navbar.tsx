import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useEscapeKey } from '@/shared/hooks/useEscapeKey';
import { useScrolled } from '@/shared/hooks/useScrolled';
import { cn } from '@/lib/utils';
import navbarLogo from '@/assets/navbar.png';
import { NAV_ITEMS } from '../constants';
import { Container } from './Container';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  // Transparent at the top of the page (over the Hero's own light gradient
  // panel, where `text-muted-foreground`/`text-foreground` already clear
  // AA against the cream background) and switching to the existing frosted
  // treatment once scrolled — every other section (Services cards, the
  // Pricing band, dark panels) needs the opaque backdrop for nav-link
  // contrast. See design-system.md §7.2.
  const isScrolled = useScrolled();

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
    //
    // `fixed` (not `sticky`): a sticky header still reserves its own row in
    // normal flow, which pushed the Hero (and its gradient wash) down by the
    // header's own height — a flat `bg-background` strip showed through the
    // transparent header instead of the Hero's gradient. `fixed` removes the
    // header from flow entirely so the Hero starts at the very top of the
    // page and its `BrandGradientAccent` runs continuously behind the
    // transparent header. `inset-x-0` replaces the full-width stretch a flex
    // child gets for free, since a fixed element no longer participates in
    // `LandingLayout`'s flex column.
    //
    // Transparent-at-top: fully transparent (no fill, no border, no blur)
    // only while `!isScrolled`, i.e. only while positioned over the Hero's
    // own light background. The instant the page scrolls past `threshold`
    // this reverts to the original frosted/solid bar so nav links stay
    // readable over every other section. `transition-colors` covers the
    // background/border swap; backdrop-blur itself cannot be transitioned
    // so it's simply toggled off/on at the same instant, which reads as
    // part of the same fade rather than a separate snap.
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300',
        isScrolled
          ? 'border-glass-border bg-glass-bg shadow-[0_1px_0_0_rgba(100,80,60,0.06)] backdrop-blur-xl backdrop-saturate-150'
          : 'border-transparent bg-transparent shadow-none',
      )}
    >
      <Container as="nav" aria-label="Primary" className="flex h-16 items-center justify-between">
        <a href="#home" className="flex items-center">
          {/* 56px tall, matching the previous logo's footprint so the bar
              keeps its established 64px rhythm. `navbar.png`'s intrinsic
              1536x1024 (3:2) is declared via width/height to reserve layout
              space; CSS then scales it down to the rendered size. */}
          <img src={navbarLogo} alt="CodeHaus" width={1536} height={1024} className="h-28 w-auto" />
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
