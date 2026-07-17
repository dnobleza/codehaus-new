import { FolderKanban, Wallet } from 'lucide-react';

import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/shared/components/feature/DataTable';
import { StatCard } from '@/shared/components/feature/StatCard';
import { useAuthStore } from '@/shared/store/auth.store';
import { INVOICE_STATUS_VARIANT, PROJECT_STATUS_VARIANT } from '@/shared/utils/statusVariant';
import { MOCK_CLIENT_INVOICES, MOCK_CLIENT_PROJECTS } from './mockData';

/**
 * Client dashboard home. Static/hardcoded mock data only — no network calls,
 * per the brief (dashboards prove routing/role-redirect, not data wiring).
 * Layout follows design-system.md §3.3.
 */
export function DashboardPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back{user ? `, ${user.firstName}` : ''}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here's where things stand across your projects.
        </p>
      </div>

      <Alert
        variant="info"
        title="Invoice due soon"
        description="INV-1050 for $2,800.00 is due on Jul 28, 2026."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Active projects" value="3" icon={FolderKanban} />
        <StatCard
          label="Outstanding balance"
          value="$7,000.00"
          icon={Wallet}
          trend={{ value: '1 overdue', direction: 'down' }}
        />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-foreground">Your projects</h2>
        <DataTable
          columns={[
            { header: 'Project', accessor: (row) => row.name },
            {
              header: 'Status',
              accessor: (row) => (
                <Badge variant={PROJECT_STATUS_VARIANT[row.status] ?? 'neutral'}>
                  {row.status}
                </Badge>
              ),
            },
            { header: 'Next milestone', accessor: (row) => row.nextMilestone },
            { header: 'Due date', accessor: (row) => row.dueDate, className: 'text-right' },
          ]}
          rows={MOCK_CLIENT_PROJECTS}
          getRowKey={(row) => row.id}
        />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-foreground">Invoices needing attention</h2>
        <DataTable
          columns={[
            { header: 'Invoice #', accessor: (row) => row.invoiceNo },
            { header: 'Amount', accessor: (row) => row.amount },
            {
              header: 'Status',
              accessor: (row) => (
                <Badge variant={INVOICE_STATUS_VARIANT[row.status] ?? 'neutral'}>
                  {row.status}
                </Badge>
              ),
            },
            { header: 'Due date', accessor: (row) => row.dueDate, className: 'text-right' },
          ]}
          rows={MOCK_CLIENT_INVOICES}
          getRowKey={(row) => row.id}
        />
      </div>
    </div>
  );
}

export default DashboardPage;
