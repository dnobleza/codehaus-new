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
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
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
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
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
          <Button onClick={() => navigate('/register')}>Sign up</Button>
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
                'fixed inset-x-0 top-16 z-40 h-[calc(100vh-4rem)] w-full overflow-y-auto bg-card lg:hidden',
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
                      className="block rounded-md px-3 py-3 text-base font-medium text-foreground hover:bg-muted"
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
