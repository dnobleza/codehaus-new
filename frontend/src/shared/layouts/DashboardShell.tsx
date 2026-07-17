import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { LogOut, Menu, X } from 'lucide-react';

import { useAuthStore } from '@/shared/store/auth.store';
import { useEscapeKey } from '@/shared/hooks/useEscapeKey';
import { cn } from '@/lib/utils';
import type { DashboardNavItem } from './dashboardNav.config';

interface DashboardShellProps {
  navItems: DashboardNavItem[];
  roleLabel: string;
}

function SidebarNav({ navItems, onNavigate }: { navItems: DashboardNavItem[]; onNavigate?: () => void }) {
  return (
    <nav aria-label="Dashboard" className="flex flex-1 flex-col gap-1 px-3 py-4">
      {navItems.map((item, index) => {
        const isActive = index === 0;
        return (
          <button
            key={item.label}
            type="button"
            disabled={item.disabled}
            aria-current={isActive ? 'page' : undefined}
            onClick={onNavigate}
            className={cn(
              'flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary/8 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40',
            )}
          >
            <item.icon className="size-5 shrink-0" aria-hidden="true" />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

/**
 * Shared sidebar + topbar shell used by all three protected dashboards.
 * Client, Staff, and Admin dashboards mount the same shell at their own
 * distinct routes with role-specific nav config (see the brief's guidance
 * that staff/admin may share a layout component instance while keeping
 * separate URLs).
 */
export function DashboardShell({ navItems, roleLabel }: DashboardShellProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const navigate = useNavigate();

  useEscapeKey(isMobileNavOpen, () => setIsMobileNavOpen(false));

  function handleLogout() {
    // Dashboards are mock-data-only for this phase; logout only clears the
    // local session rather than calling the real /auth/logout endpoint.
    clearSession();
    navigate('/login');
  }

  return (
    <div className="flex min-h-screen bg-background">
      <a
        href="#dashboard-main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="hidden w-[264px] shrink-0 flex-col border-r border-border bg-card lg:flex">
        <div className="flex h-16 items-center border-b border-border px-6">
          <span className="text-lg font-bold tracking-tight text-foreground">CodeHaus</span>
        </div>
        <SidebarNav navItems={navItems} />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {isMobileNavOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-foreground/50 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsMobileNavOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              className="fixed inset-y-0 left-0 z-50 flex w-full max-w-xs flex-col bg-card lg:hidden"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <div className="flex h-16 items-center justify-between border-b border-border px-6">
                <span className="text-lg font-bold tracking-tight text-foreground">CodeHaus</span>
                <button
                  type="button"
                  aria-label="Close menu"
                  onClick={() => setIsMobileNavOpen(false)}
                  className="inline-flex size-10 items-center justify-center rounded-md text-foreground"
                >
                  <X className="size-5" />
                </button>
              </div>
              <SidebarNav navItems={navItems} onNavigate={() => setIsMobileNavOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setIsMobileNavOpen(true)}
              className="inline-flex size-10 items-center justify-center rounded-md text-foreground lg:hidden"
            >
              <Menu className="size-5" />
            </button>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {roleLabel} dashboard
              </p>
              {user && (
                <p className="text-xs text-muted-foreground">
                  {user.firstName} {user.lastName}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut className="size-4" aria-hidden="true" />
            Log out
          </button>
        </header>

        <main id="dashboard-main-content" className="flex-1 px-4 py-8 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
