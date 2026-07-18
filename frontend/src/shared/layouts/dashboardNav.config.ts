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
  Package,
  Puzzle,
  Receipt,
  Settings,
  Users,
} from 'lucide-react';

export interface DashboardNavItem {
  label: string;
  icon: LucideIcon;
  /** Items without a `path` render as inert disabled buttons (still-mock sections). */
  disabled?: boolean;
  /** Real route to navigate to. Only set once a module has a real page wired up. */
  path?: string;
}

export const CLIENT_NAV_ITEMS: DashboardNavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/client/dashboard' },
  { label: 'Projects', icon: FolderKanban, path: '/client/dashboard/projects' },
  { label: 'Quotations', icon: FileText, disabled: true },
  { label: 'Invoices', icon: Receipt, disabled: true },
  { label: 'Payments', icon: CreditCard, disabled: true },
  { label: 'Messages', icon: MessageSquare, disabled: true },
  { label: 'Notifications', icon: Bell, disabled: true },
  { label: 'Settings', icon: Settings, disabled: true },
];

export const STAFF_NAV_ITEMS: DashboardNavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/staff/dashboard' },
  { label: 'Projects', icon: FolderKanban, path: '/staff/dashboard/projects' },
  { label: 'Payments', icon: CreditCard, path: '/staff/dashboard/payments' },
  { label: 'Clients', icon: Users, disabled: true },
  { label: 'Quotations', icon: FileText, disabled: true },
  { label: 'Invoices', icon: Receipt, disabled: true },
  { label: 'Support', icon: LifeBuoy, disabled: true },
  { label: 'Settings', icon: Settings, disabled: true },
];

export const ADMIN_NAV_ITEMS: DashboardNavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
  { label: 'Projects', icon: FolderKanban, path: '/admin/dashboard/projects' },
  { label: 'Payments', icon: CreditCard, path: '/admin/dashboard/payments' },
  { label: 'Packages', icon: Package, path: '/admin/dashboard/packages' },
  { label: 'Add-ons', icon: Puzzle, path: '/admin/dashboard/addons' },
  { label: 'Clients', icon: Users, disabled: true },
  { label: 'Team', icon: Users, disabled: true },
  { label: 'Reports', icon: BarChart3, disabled: true },
  { label: 'Support', icon: LifeBuoy, disabled: true },
  { label: 'Settings', icon: Settings, disabled: true },
];
