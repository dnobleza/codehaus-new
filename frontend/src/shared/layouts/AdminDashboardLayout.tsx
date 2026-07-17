import { DashboardShell } from './DashboardShell';
import { ADMIN_NAV_ITEMS } from './dashboardNav.config';

export function AdminDashboardLayout() {
  return <DashboardShell navItems={ADMIN_NAV_ITEMS} roleLabel="Admin" />;
}
