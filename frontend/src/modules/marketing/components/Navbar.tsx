import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useEscapeKey } from '@/shared/hooks/useEscapeKey';
import { cn } from '@/lib/utils';
import codehausLogo from '@/assets/codehaus-logo.svg';
import { NAV_ITEMS } from '../constants';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  useEscapeKey(isOpen, () => setIsOpen(false));

  function handleNavClick() {
    setIsOpen(false);
  }

  return (
    // Glassmorphic header (§7.2): frosted translucent bar over whatever
    // scrolls beneath it, with a warm clay hairline instead of a blue one. The
    // rounded `--radius-clay` treatment is deliberately NOT applied here — a
    // full-bleed sticky bar reads better with square edges.
    <header className="sticky top-0 z-50 border-b border-glass-border bg-glass-bg shadow-[0_1px_0_0_rgba(100,80,60,0.06)] backdrop-blur-xl backdrop-saturate-150">
      <nav
        aria-label="Primary"
        className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
      >
        <a href="#home" className="flex items-center">
          <img src={codehausLogo} alt="CodeHaus" className="h-19 w-auto" />
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
          <Button
            onClick={() => navigate('/register')}
            // `rounded-full` must be stated here: Button's base `rounded-lg`
            // is a utility and would otherwise beat `.clay-surface`'s radius.
            className="clay-surface clay-lift rounded-full bg-primary px-6 py-2 font-semibold text-primary-foreground hover:bg-primary"
          >
            Sign up
          </Button>
        </div>

        <button
          type="button"
          className="inline-flex size-10 items-center justify-center rounded-md text-foreground lg:hidden"
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isOpen}
          aria-controls="mobile-nav-drawer"
          onClick={() => setIsOpen((prev) => !prev)}
        >
          {isOpen ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </nav>

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
              className={cn(
                'fixed inset-x-0 top-16 z-40 h-[calc(100vh-4rem)] w-full overflow-y-auto bg-glass-bg backdrop-blur-xl backdrop-saturate-150 lg:hidden',
              )}
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
              <div className="flex flex-col gap-3 border-t border-border px-6 py-6">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/login');
                  }}
                >
                  Log in
                </Button>
                <Button
                  size="lg"
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
