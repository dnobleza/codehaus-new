import { Link, Outlet } from 'react-router-dom';

import { Card } from '@/components/ui/card';

/** Centered card shell for auth forms, per design-system.md §3.1. */
export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-[400px]">
        <Link
          to="/"
          className="mb-6 flex h-8 items-center justify-center text-xl font-bold tracking-tight text-foreground"
        >
          CodeHaus
        </Link>

        <Card className="shadow-sm">
          <Outlet />
        </Card>
      </div>
    </div>
  );
}
