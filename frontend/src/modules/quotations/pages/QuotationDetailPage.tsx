import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import { Alert } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { LoadingSpinner } from '@/shared/components/common/LoadingSpinner';
import { formatPHP, toNumber } from '@/shared/utils/currency';
import { formatTimelineRange } from '@/shared/utils/timeline';
import type { ApiError } from '@/shared/api/apiClient';
import { useProject } from '@/modules/projects/api/projects.queries';
import { useProjectPayments } from '@/modules/payments/api/payments.queries';
import { PaymentReceiptCard } from '@/modules/payments/components/PaymentReceiptCard';
import { PaymentScheduleCard } from '@/modules/payments/components/PaymentScheduleCard';
import { computeProjectedInstallments } from '@/modules/payments/utils/projectedSchedule';
import { useAcceptQuotation, useRejectQuotation } from '../api/quotations.queries';
import { QuotationSummaryCard } from '../components/QuotationSummaryCard';

/**
 * A single quotation, read out of its parent project (the API has no
 * `GET /quotations/:id` — see `quotations.api.ts`). This page owns the
 * accept/reject decision: it is the only call site for those mutations, so
 * the client reviews cost and payment commitment in one place rather than
 * splitting the decision across the project's Invoices tab.
 *
 * Before acceptance the installment schedule is a frontend projection —
 * the server doesn't create real installment rows until accept succeeds.
 */
export function QuotationDetailPage() {
  const { projectId, quotationId } = useParams<{ projectId: string; quotationId: string }>();
  const { data: project, isLoading, isError, refetch } = useProject(projectId ?? '');
  const { data: payments } = useProjectPayments(projectId ?? '');

  const acceptQuotation = useAcceptQuotation(projectId ?? '');
  const rejectQuotation = useRejectQuotation(projectId ?? '');

  if (isLoading) {
    return <LoadingSpinner label="Loading quotation..." />;
  }

  const quotation = project?.quotations?.find((row) => row.id === quotationId);

  if (isError || !project || !quotation) {
    return <ErrorState description="We couldn't load this quotation." onRetry={() => refetch()} />;
  }

  const mutationError = (acceptQuotation.error ?? rejectQuotation.error) as ApiError | null;
  const projectedInstallments = computeProjectedInstallments(quotation.total_amount);
  const isPending = acceptQuotation.isPending || rejectQuotation.isPending;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{quotation.quotation_number}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{project.title}</p>
        </div>
        <Link
          to="/client/dashboard/quotations"
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          All quotations
        </Link>
      </div>

      {mutationError && (
        <Alert variant="danger" title="Something went wrong" description={mutationError.message} />
      )}

      {quotation.status === 'draft' && (
        <Alert
          variant="info"
          title="Your quotation is being prepared"
          description="We're reviewing your request. You'll be able to review and accept your quotation once it's ready."
        />
      )}

      {quotation.status === 'rejected' && (
        <Alert
          variant="warning"
          title="You requested changes"
          description="Our team will follow up with a revised quotation."
        />
      )}

      {quotation.status === 'expired' && (
        <Alert
          variant="warning"
          title="This quotation has expired"
          description="Get in touch with our team and we'll prepare an updated one for you."
        />
      )}

      {quotation.status === 'sent' && (
        <>
          <QuotationSummaryCard
            quotationNumber={quotation.quotation_number}
            packageLabel={project.title}
            basePrice={toNumber(quotation.base_price)}
            addonLines={(quotation.addons ?? []).map((addon) => ({
              label: addon.name,
              amount: addon.priceAtTime,
            }))}
            total={toNumber(quotation.total_amount)}
            timelineLabel={formatTimelineRange(
              quotation.estimated_timeline_min_days,
              quotation.estimated_timeline_max_days,
            )}
            footer={
              <>
                <Button
                  variant="outline"
                  onClick={() => rejectQuotation.mutate(quotation.id)}
                  disabled={isPending}
                >
                  Request Changes
                </Button>
                <Button onClick={() => acceptQuotation.mutate(quotation.id)} disabled={isPending}>
                  {acceptQuotation.isPending ? 'Accepting...' : 'Accept Quotation'}
                </Button>
              </>
            }
          />

          <PaymentScheduleCard projected={projectedInstallments} />
        </>
      )}

      {quotation.status === 'accepted' && (
        <>
          <Alert
            variant="success"
            title="Quotation accepted"
            description={`You accepted ${quotation.quotation_number} for ${formatPHP(quotation.total_amount)}.`}
          />

          <PaymentReceiptCard project={project} quotation={quotation} payment={payments?.[0]} />

          <Link
            to={`/client/dashboard/projects/${project.id}`}
            className={buttonVariants({ variant: 'outline' })}
          >
            Go to project to submit a payment
          </Link>
        </>
      )}
    </div>
  );
}

export default QuotationDetailPage;
