import { Outlet } from 'react-router-dom';

import { Footer } from '@/modules/marketing/components/Footer';
import { Navbar } from '@/modules/marketing/components/Navbar';

/**
 * Public marketing shell: sticky header nav + footer, no sidebar.
 *
 * `theme-clay` scopes the landing page's warm clay + frosted glass palette
 * (index.css, design-system.md §7) to this subtree only — every app surface
 * outside the marketing route keeps the brand-blue tokens defined at `:root`.
 */
export function LandingLayout() {
  return (
    <div className="theme-clay bg-background flex min-h-screen flex-col font-poppins">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="main-content" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
