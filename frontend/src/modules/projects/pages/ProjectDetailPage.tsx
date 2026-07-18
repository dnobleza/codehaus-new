import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { LoadingSpinner } from '@/shared/components/common/LoadingSpinner';
import { formatPHP, toNumber } from '@/shared/utils/currency';
import { formatTimelineRange } from '@/shared/utils/timeline';
import type { ApiError } from '@/shared/api/apiClient';
import { useProject } from '../api/projects.queries';
import { ProjectStatusStepper } from '../components/ProjectStatusStepper';
import { useAcceptQuotation, useRejectQuotation } from '@/modules/quotations/api/quotations.queries';
import { QuotationSummaryCard } from '@/modules/quotations/components/QuotationSummaryCard';
import { useProjectPayments } from '@/modules/payments/api/payments.queries';
import { PaymentForm } from '@/modules/payments/components/PaymentForm';
import { PaymentProofPreview } from '@/modules/payments/components/PaymentProofPreview';

const PAYMENT_STATUS_BADGE = {
  pending: 'neutral',
  verification: 'warning',
  verified: 'success',
  rejected: 'danger',
} as const;

const PAYMENT_STATUS_LABEL = {
  pending: 'Pending',
  verification: 'Under Verification',
  verified: 'Verified',
  rejected: 'Rejected — please resubmit',
} as const;

/**
 * Project status/detail page (task brief page 3): status stepper, quotation
 * review + accept/reject once sent, then payment method + proof-of-payment
 * submission once accepted, polling for the admin-driven transitions in
 * between (see `useProject`'s `refetchInterval`).
 */
export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: project, isLoading, isError, refetch } = useProject(id);
  const { data: payments } = useProjectPayments(id);

  const acceptQuotation = useAcceptQuotation(id ?? '');
  const rejectQuotation = useRejectQuotation(id ?? '');

  if (isLoading) {
    return <LoadingSpinner label="Loading project..." />;
  }

  if (isError || !project) {
    return <ErrorState description="We couldn't load this project." onRetry={() => refetch()} />;
  }

  const latestQuotation = project.quotations?.[0];
  const quotationError = (acceptQuotation.error ?? rejectQuotation.error) as ApiError | null;

  const latestPayment = payments?.[0];
  const hasVerifiedPayment = (payments ?? []).some((payment) => payment.status === 'verified');
  const canSubmitPayment =
    latestQuotation?.status === 'accepted' &&
    !hasVerifiedPayment &&
    (!latestPayment || latestPayment.status === 'rejected');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          to="/client/dashboard/projects"
          className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to projects
        </Link>
        <h1 className="text-2xl font-bold text-foreground">{project.title}</h1>
        {project.request_details && (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{project.request_details}</p>
        )}
      </div>

      <Card>
        <CardContent>
          <ProjectStatusStepper status={project.status_code} />
        </CardContent>
      </Card>

      {project.status_code === 'cancelled' && project.decline_reason && (
        <Alert
          variant="danger"
          title="This request was declined"
          description={project.decline_reason}
        />
      )}

      {/* Custom project awaiting an admin-prepared quotation */}
      {project.package_id === null && !latestQuotation && project.status_code !== 'cancelled' && (
        <Alert
          variant="info"
          title="Your custom quotation is being prepared"
          description="Our team is reviewing your request and will prepare a tailored quotation for you shortly."
        />
      )}

      {quotationError && (
        <Alert variant="danger" title="Something went wrong" description={quotationError.message} />
      )}

      {latestQuotation && latestQuotation.status === 'draft' && (
        <Alert
          variant="info"
          title="Your quotation is being prepared"
          description="We're reviewing your request. You'll be able to review and accept your quotation once it's ready."
        />
      )}

      {latestQuotation && latestQuotation.status === 'sent' && (
        <QuotationSummaryCard
          quotationNumber={latestQuotation.quotation_number}
          packageLabel={project.title}
          basePrice={toNumber(latestQuotation.base_price)}
          addonLines={(latestQuotation.addons ?? []).map((addon) => ({
            label: addon.name,
            amount: addon.priceAtTime,
          }))}
          total={toNumber(latestQuotation.total_amount)}
          timelineLabel={formatTimelineRange(
            latestQuotation.estimated_timeline_min_days,
            latestQuotation.estimated_timeline_max_days,
          )}
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => rejectQuotation.mutate(latestQuotation.id)}
                disabled={acceptQuotation.isPending || rejectQuotation.isPending}
              >
                Request Changes
              </Button>
              <Button
                onClick={() => acceptQuotation.mutate(latestQuotation.id)}
                disabled={acceptQuotation.isPending || rejectQuotation.isPending}
              >
                {acceptQuotation.isPending ? 'Accepting...' : 'Accept Quotation'}
              </Button>
            </>
          }
        />
      )}

      {latestQuotation && latestQuotation.status === 'rejected' && (
        <Alert
          variant="warning"
          title="You requested changes"
          description="Our team will follow up with a revised quotation."
        />
      )}

      {latestQuotation && latestQuotation.status === 'accepted' && (
        <Alert
          variant="success"
          title="Quotation accepted"
          description={`You accepted ${latestQuotation.quotation_number} for ${formatPHP(latestQuotation.total_amount)}.`}
        />
      )}

      {canSubmitPayment && (
        <Card className="mx-auto w-full max-w-md">
          <CardHeader>
            <CardTitle>Select a payment method</CardTitle>
          </CardHeader>
          <CardContent>
            {latestPayment?.status === 'rejected' && (
              <Alert
                className="mb-4"
                variant="danger"
                title="Your previous payment wasn't verified"
                description="Please double-check your details and resubmit proof of payment."
              />
            )}
            <PaymentForm
              projectId={project.id}
              defaultAmount={toNumber(latestQuotation?.total_amount)}
            />
          </CardContent>
        </Card>
      )}

      {latestPayment && (
        <Card className="mx-auto w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Payment</CardTitle>
              <Badge variant={PAYMENT_STATUS_BADGE[latestPayment.status]}>
                {PAYMENT_STATUS_LABEL[latestPayment.status]}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {project.status_code === 'accepted' ? (
              <Alert
                variant="success"
                title="Your project has been accepted!"
                description="We'll be in touch shortly to schedule development."
              />
            ) : latestPayment.status === 'verification' ? (
              <Alert
                variant="warning"
                title="Payment under verification"
                description="We've received your payment and are verifying it. This page updates automatically."
              />
            ) : null}
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-muted-foreground">Amount</dt>
              <dd className="text-right font-medium text-foreground">{formatPHP(latestPayment.amount)}</dd>
              <dt className="text-muted-foreground">Reference number</dt>
              <dd className="text-right font-medium text-foreground">
                {latestPayment.reference_number ?? '—'}
              </dd>
            </dl>
            <PaymentProofPreview proofUrl={latestPayment.proof_of_payment_url} />
          </CardContent>
        </Card>
      )}

      {project.status_code === 'accepted' && !latestPayment && (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <CheckCircle2 className="size-10 text-success" aria-hidden="true" />
          <p className="text-base font-semibold text-foreground">Your project has been accepted!</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            We'll be in touch shortly to schedule development.
          </p>
        </div>
      )}
    </div>
  );
}

export default ProjectDetailPage;
