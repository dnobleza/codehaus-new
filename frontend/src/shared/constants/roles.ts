export const ROLES = {
  CLIENT: 'client',
  STAFF: 'staff',
  ADMIN: 'admin',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

const ROLE_DASHBOARD_PATHS: Record<Role, string> = {
  [ROLES.CLIENT]: '/client/dashboard',
  [ROLES.STAFF]: '/staff/dashboard',
  [ROLES.ADMIN]: '/admin/dashboard',
};

/** Returns the dashboard route a given role should land on after login. */
export function dashboardPathForRole(role: Role): string {
  return ROLE_DASHBOARD_PATHS[role] ?? '/login';
}
