import { CheckCircle2 } from 'lucide-react';

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
import { ProjectStatusStepper } from './ProjectStatusStepper';
import {
  useAcceptQuotation,
  useRejectQuotation,
} from '@/modules/quotations/api/quotations.queries';
import { QuotationSummaryCard } from '@/modules/quotations/components/QuotationSummaryCard';
import { useProjectPayments } from '@/modules/payments/api/payments.queries';
import { PaymentForm } from '@/modules/payments/components/PaymentForm';
import { PaymentProofPreview } from '@/modules/payments/components/PaymentProofPreview';
import { PaymentScheduleCard } from '@/modules/payments/components/PaymentScheduleCard';

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

interface InvoicesTabProps {
  projectId: string;
}

/**
 * Invoices tab: the project's quotation-review + proof-of-payment flow.
 * This is a straight extraction of what used to be the entire
 * `ProjectDetailPage` body (status stepper, quotation accept/reject,
 * payment schedule, payment method + proof-of-payment submission, polling
 * for admin-driven transitions) — behavior is unchanged, it just now lives
 * behind the Invoices tab instead of being the whole page. Self-contained
 * (fetches its own data via `projectId`) so Base UI's Tabs only mounts it
 * — and only fires its queries — once the client actually opens this tab.
 */
export function InvoicesTab({ projectId }: InvoicesTabProps) {
  const { data: project, isLoading, isError, refetch } = useProject(projectId);
  const { data: payments } = useProjectPayments(projectId);

  const acceptQuotation = useAcceptQuotation(projectId);
  const rejectQuotation = useRejectQuotation(projectId);

  if (isLoading) {
    return <LoadingSpinner label="Loading invoices..." />;
  }

  if (isError || !project) {
    return (
      <ErrorState
        description="We couldn't load this project's invoices."
        onRetry={() => refetch()}
      />
    );
  }

  const latestQuotation = project.quotations?.[0];
  const quotationError = (acceptQuotation.error ?? rejectQuotation.error) as ApiError | null;

  const latestPayment = payments?.[0];
  // Sequence-ordered by the API, so `.find` naturally returns the
  // lowest-sequence pending row — the same installment the server resolves
  // "the next pending installment" to when validating a payment submission.
  const nextPendingInstallment = project.paymentInstallments?.find(
    (installment) => installment.status === 'pending',
  );
  const isFullyPaid = Boolean(project.paymentInstallments?.length) && !nextPendingInstallment;
  const remainingInstallmentCount =
    project.paymentInstallments?.filter((installment) => installment.status === 'pending').length ??
    0;
  const canSubmitPayment =
    latestQuotation?.status === 'accepted' &&
    Boolean(nextPendingInstallment) &&
    (!latestPayment || latestPayment.status !== 'verification');

  return (
    <div className="flex flex-col gap-6">
      {project.request_details && (
        <p className="max-w-2xl text-sm text-muted-foreground">{project.request_details}</p>
      )}

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

      <PaymentScheduleCard installments={project.paymentInstallments} />

      {canSubmitPayment && nextPendingInstallment && (
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
              key={nextPendingInstallment.id}
              projectId={project.id}
              installment={nextPendingInstallment}
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
            {isFullyPaid ? (
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
            ) : project.status_code === 'accepted' ? (
              <Alert
                variant="info"
                title="Downpayment received"
                description={`${remainingInstallmentCount} installment${remainingInstallmentCount === 1 ? '' : 's'} remaining. You can submit your next payment below.`}
              />
            ) : null}
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-muted-foreground">Amount</dt>
              <dd className="text-right font-medium text-foreground">
                {formatPHP(latestPayment.amount)}
              </dd>
              <dt className="text-muted-foreground">Reference number</dt>
              <dd className="text-right font-medium text-foreground">
                {latestPayment.reference_number ?? '—'}
              </dd>
            </dl>
            <PaymentProofPreview proofUrl={latestPayment.proof_of_payment_url} />
          </CardContent>
        </Card>
      )}

      {project.status_code === 'accepted' && !latestPayment && isFullyPaid && (
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
