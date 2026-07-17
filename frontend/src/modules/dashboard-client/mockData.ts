export interface ClientProjectRow {
  id: string;
  name: string;
  status: string;
  nextMilestone: string;
  dueDate: string;
}

export interface ClientInvoiceRow {
  id: string;
  invoiceNo: string;
  amount: string;
  status: string;
  dueDate: string;
}

export const MOCK_CLIENT_PROJECTS: ClientProjectRow[] = [
  {
    id: 'p1',
    name: 'Storefront Redesign',
    status: 'In Progress',
    nextMilestone: 'Checkout flow QA',
    dueDate: 'Jul 24, 2026',
  },
  {
    id: 'p2',
    name: 'Mobile App — Phase 2',
    status: 'Review',
    nextMilestone: 'Client sign-off',
    dueDate: 'Aug 02, 2026',
  },
  {
    id: 'p3',
    name: 'Analytics Dashboard',
    status: 'Planning',
    nextMilestone: 'Kickoff call',
    dueDate: 'Aug 15, 2026',
  },
  {
    id: 'p4',
    name: 'Brand Site Refresh',
    status: 'Completed',
    nextMilestone: '—',
    dueDate: 'Jun 30, 2026',
  },
];

export const MOCK_CLIENT_INVOICES: ClientInvoiceRow[] = [
  { id: 'i1', invoiceNo: 'INV-1042', amount: '$4,200.00', status: 'Overdue', dueDate: 'Jul 10, 2026' },
  { id: 'i2', invoiceNo: 'INV-1050', amount: '$2,800.00', status: 'Sent', dueDate: 'Jul 28, 2026' },
  { id: 'i3', invoiceNo: 'INV-1038', amount: '$6,150.00', status: 'Paid', dueDate: 'Jun 15, 2026' },
];
