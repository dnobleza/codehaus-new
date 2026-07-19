import codehausLogo from '@/assets/codehaus-logo.svg';
import { NAV_ITEMS } from '../constants';

const CURRENT_YEAR = new Date().getFullYear();

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
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
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
      <div className="border-t border-border">
        <p className="mx-auto max-w-7xl px-4 py-6 text-xs text-muted-foreground sm:px-6 lg:px-8">
          © {CURRENT_YEAR} CodeHaus. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
