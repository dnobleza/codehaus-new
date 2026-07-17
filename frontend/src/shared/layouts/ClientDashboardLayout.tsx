import { DashboardShell } from './DashboardShell';
import { CLIENT_NAV_ITEMS } from './dashboardNav.config';

export function ClientDashboardLayout() {
  return <DashboardShell navItems={CLIENT_NAV_ITEMS} roleLabel="Client" />;
}
