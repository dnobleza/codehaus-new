import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/shared/components/feature/DataTable';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { LoadingSpinner } from '@/shared/components/common/LoadingSpinner';
import { formatPHP } from '@/shared/utils/currency';
import { useMyQuotations } from '../api/quotations.queries';
import { QUOTATION_STATUS_BADGE_VARIANT, QUOTATION_STATUS_LABELS } from '../utils/quotationStatus';

/**
 * Client's quotations across every project they own (design-system.md §3.8
 * table-first pattern, same shape as `ProjectsListPage`). Each row links to
 * the detail page by `projectId/quotationId` — the API has no
 * `GET /quotations/:id`, so the detail page reads its quotation out of the
 * parent project.
 */
export function QuotationsListPage() {
  const { data: quotations, isLoading, isError, refetch } = useMyQuotations();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Quotations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every quotation CodeHaus has prepared for you, with the full cost breakdown and payment
          schedule.
        </p>
      </div>

      {isLoading && <LoadingSpinner label="Loading your quotations..." />}

      {isError && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !isError && (
        <DataTable
          columns={[
            {
              header: 'Quotation',
              accessor: (row) => (
                <Link
                  to={`/client/dashboard/quotations/${row.project_id}/${row.id}`}
                  className="font-medium text-foreground hover:text-primary-text hover:underline"
                >
                  {row.quotation_number}
                </Link>
              ),
            },
            { header: 'Project', accessor: (row) => row.project_title },
            {
              header: 'Status',
              accessor: (row) => (
                <Badge variant={QUOTATION_STATUS_BADGE_VARIANT[row.status]}>
                  {QUOTATION_STATUS_LABELS[row.status]}
                </Badge>
              ),
            },
            {
              header: 'Total',
              accessor: (row) => formatPHP(row.total_amount),
              className: 'text-right',
            },
            {
              header: 'Received',
              accessor: (row) => new Date(row.created_at).toLocaleDateString(),
              className: 'text-right',
            },
          ]}
          rows={quotations ?? []}
          getRowKey={(row) => row.id}
          emptyMessage="You haven't received any quotations yet."
        />
      )}
    </div>
  );
}

export default QuotationsListPage;
