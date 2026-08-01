import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/shared/store/auth.store';
import { dashboardPathForRole, type Role } from '@/shared/constants/roles';

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

/**
 * Restricts a route subtree to a specific set of roles. Assumes RequireAuth
 * already ran (so a missing `user` here means the store hasn't hydrated
 * yet, not "logged out" — that case still safely falls through to /login).
 *
 * A wrong-role-but-authenticated user is redirected to their OWN dashboard
 * rather than /login: sending an already-authenticated user to /login is a
 * dead end (there's no "already logged in" handling on that page — they'd
 * just see the login form again with no explanation). Since every role has
 * exactly one home dashboard, redirecting there is both unambiguous and
 * gets the user somewhere useful in one hop, instead of requiring a real
 * 403 page that would otherwise need its own "take me home" affordance.
 */
export function RequireRole({ roles }: { roles: Role[] }) {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!roles.includes(user.role)) {
    return <Navigate to={dashboardPathForRole(user.role)} replace />;
  }

  return <Outlet />;
}
