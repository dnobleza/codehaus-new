import codehausLogo from '@/assets/codehaus-logo.svg';
import { BrandGradientAccent } from '@/shared/components/common/BrandGradientAccent';
import { NAV_ITEMS } from '../constants';

const CURRENT_YEAR = new Date().getFullYear();

export function Footer() {
  return (
    <footer className="relative bg-background">
      <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <BrandGradientAccent
        intensity="whisper"
        layers={['linear']}
        className="inset-x-0 bottom-0 -z-10 h-64"
      />

      {/* Glassmorphic footer surface (§7.9) over the warm page base. */}
      <div className="bg-glass-bg backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-12 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <img src={codehausLogo} alt="CodeHaus" className="h-14 w-auto" />
            <p className="mt-2 max-w-xs text-sm text-muted-foreground">
              The project delivery and billing workspace for software agencies.
            </p>
          </div>

          <ul className="flex flex-wrap gap-x-8 gap-y-3">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="relative text-sm text-muted-foreground transition-[color,text-shadow] duration-200 after:absolute after:inset-x-0 after:-bottom-1 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-primary after:transition-transform after:duration-200 hover:text-foreground hover:[text-shadow:0_0_12px_rgba(212,165,116,0.5)] hover:after:scale-x-100"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="border-t border-glass-border">
          <p className="mx-auto max-w-7xl px-4 py-6 text-xs text-muted-foreground sm:px-6 lg:px-8">
            © {CURRENT_YEAR} CodeHaus. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
