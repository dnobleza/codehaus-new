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
        Hero but toned down for a data-dense/form surface — see
        BrandGradientAccent's "subtle" intensity. Base page background stays
        Alice Blue (--background) unchanged.
      */}
      <BrandGradientAccent className="inset-0 -z-10" />

      <div className="w-full max-w-[400px]">
        <Link to="/" className="mb-6 flex h-20 items-center justify-center">
          <img src={codehausLogo} alt="CodeHaus" className="h-20 w-auto" />
        </Link>

        <Card className="shadow-sm">
          <Outlet />
        </Card>
      </div>
    </div>
  );
}
