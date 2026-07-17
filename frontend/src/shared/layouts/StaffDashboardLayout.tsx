import { DashboardShell } from './DashboardShell';
import { STAFF_NAV_ITEMS } from './dashboardNav.config';

export function StaffDashboardLayout() {
  return <DashboardShell navItems={STAFF_NAV_ITEMS} roleLabel="Staff" />;
}
