import { Link, Outlet } from 'react-router-dom';

import { Card } from '@/components/ui/card';
import { BrandGradientAccent } from '@/shared/components/common/BrandGradientAccent';
import codehausLogo from '@/assets/codehaus-logo.svg';

/** Centered card shell for auth forms, per design-system.md §3.1. */
export function AuthLayout() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      {/*
        Faint app-wide brand accent, same visual language as the marketing
        Hero but toned down for a form surface — see BrandGradientAccent's
        "subtle" intensity. Token-driven, so it follows the clay palette.
      */}
      <BrandGradientAccent className="inset-0 -z-10" />

      <div className="w-full max-w-[400px]">
        <Link to="/" className="mb-6 flex h-20 items-center justify-center">
          <img src={codehausLogo} alt="CodeHaus" className="h-20 w-auto" />
        </Link>

        {/* Frosted card with clay depth (design-system.md §7.20) — the accent
            wash above stays visible through it. */}
        <Card className="glass-panel glass-clay border-glass-border p-2">
          <Outlet />
        </Card>
      </div>
    </div>
  );
}
