import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/shared/store/auth.store';
import type { Role } from '@/shared/constants/roles';

/**
 * Redirects unauthenticated users to /login, preserving the attempted
 * location so a future post-login redirect could return them here.
 *
 * NOTE: dashboards are mock-data-only for this phase, so this guard only
 * checks for a truthy in-memory access token — no silent-refresh-on-boot
 * yet (that's a later roadmap phase per the architecture doc §14 Phase 5+).
 */
export function RequireAuth() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const location = useLocation();

  if (!accessToken) {
    return <Navigate to="/login" replace state={{ redirectTo: location.pathname }} />;
  }

  return <Outlet />;
}

/** Restricts a route subtree to a specific set of roles. Assumes RequireAuth already ran. */
export function RequireRole({ roles }: { roles: Role[] }) {
  const user = useAuthStore((state) => state.user);

  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
