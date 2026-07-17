import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Bell,
  CreditCard,
  FileText,
  FolderKanban,
  LayoutDashboard,
  LifeBuoy,
  MessageSquare,
  Receipt,
  Settings,
  Users,
} from 'lucide-react';

export interface DashboardNavItem {
  label: string;
  icon: LucideIcon;
  /** Only the active item is wired to a real route in this mock-data phase. */
  disabled?: boolean;
}

export const CLIENT_NAV_ITEMS: DashboardNavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Projects', icon: FolderKanban, disabled: true },
  { label: 'Quotations', icon: FileText, disabled: true },
  { label: 'Invoices', icon: Receipt, disabled: true },
  { label: 'Payments', icon: CreditCard, disabled: true },
  { label: 'Messages', icon: MessageSquare, disabled: true },
  { label: 'Notifications', icon: Bell, disabled: true },
  { label: 'Settings', icon: Settings, disabled: true },
];

export const STAFF_NAV_ITEMS: DashboardNavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Projects', icon: FolderKanban, disabled: true },
  { label: 'Clients', icon: Users, disabled: true },
  { label: 'Quotations', icon: FileText, disabled: true },
  { label: 'Invoices', icon: Receipt, disabled: true },
  { label: 'Support', icon: LifeBuoy, disabled: true },
  { label: 'Settings', icon: Settings, disabled: true },
];

export const ADMIN_NAV_ITEMS: DashboardNavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Clients', icon: Users, disabled: true },
  { label: 'Projects', icon: FolderKanban, disabled: true },
  { label: 'Team', icon: Users, disabled: true },
  { label: 'Reports', icon: BarChart3, disabled: true },
  { label: 'Support', icon: LifeBuoy, disabled: true },
  { label: 'Settings', icon: Settings, disabled: true },
];
