import { CheckCircle2, FileText, MessageSquare, UserPlus } from 'lucide-react';
import type { ActivityEntry } from '@/shared/components/feature/ActivityFeed';

export interface AdminPaymentRow {
  id: string;
  client: string;
  invoiceNo: string;
  amount: string;
  method: string;
  status: string;
}

export const MOCK_ADMIN_ACTIVITY: ActivityEntry[] = [
  { id: 'a1', icon: CheckCircle2, title: 'Project "Storefront Redesign" marked In Progress', timestamp: '2 hours ago' },
  { id: 'a2', icon: FileText, title: 'Quotation Q-2088 sent to Nimbus Retail', timestamp: '5 hours ago' },
  { id: 'a3', icon: UserPlus, title: 'New client "Harbor & Co." signed up', timestamp: 'Yesterday' },
  { id: 'a4', icon: MessageSquare, title: '3 new messages on "Mobile App — Phase 2"', timestamp: 'Yesterday' },
];

export const MOCK_ADMIN_TASKS: ActivityEntry[] = [
  { id: 't1', icon: FileText, title: 'Approve quotation Q-2091', timestamp: 'Due today' },
  { id: 't2', icon: FileText, title: 'Send invoice for "Analytics Dashboard"', timestamp: 'Due tomorrow' },
  { id: 't3', icon: MessageSquare, title: 'Reply to support ticket #482', timestamp: 'Due in 2 days' },
];

export const MOCK_ADMIN_PAYMENTS: AdminPaymentRow[] = [
  { id: 'pay1', client: 'Nimbus Retail', invoiceNo: 'INV-1038', amount: '$6,150.00', method: 'Card', status: 'Completed' },
  { id: 'pay2', client: 'Harbor & Co.', invoiceNo: 'INV-1029', amount: '$3,400.00', method: 'Bank transfer', status: 'Pending' },
  { id: 'pay3', client: 'Vesta Labs', invoiceNo: 'INV-1011', amount: '$980.00', method: 'Card', status: 'Failed' },
];
