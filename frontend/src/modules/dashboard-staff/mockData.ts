import { CheckCircle2, FileText, MessageSquare } from 'lucide-react';
import type { ActivityEntry } from '@/shared/components/feature/ActivityFeed';

export interface StaffProjectRow {
  id: string;
  name: string;
  client: string;
  status: string;
  dueDate: string;
}

export const MOCK_STAFF_PROJECTS: StaffProjectRow[] = [
  { id: 's1', name: 'Storefront Redesign', client: 'Nimbus Retail', status: 'In Progress', dueDate: 'Jul 24, 2026' },
  { id: 's2', name: 'Mobile App — Phase 2', client: 'Vesta Labs', status: 'Review', dueDate: 'Aug 02, 2026' },
  { id: 's3', name: 'Onboarding Portal', client: 'Harbor & Co.', status: 'Planning', dueDate: 'Aug 20, 2026' },
];

export const MOCK_STAFF_ACTIVITY: ActivityEntry[] = [
  { id: 'sa1', icon: CheckCircle2, title: 'You closed task "Checkout API integration"', timestamp: '1 hour ago' },
  { id: 'sa2', icon: FileText, title: 'Quotation Q-2088 assigned to you for review', timestamp: '3 hours ago' },
  { id: 'sa3', icon: MessageSquare, title: 'New message from Nimbus Retail on Storefront Redesign', timestamp: 'Yesterday' },
];
