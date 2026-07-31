import { Link } from 'react-router-dom';

import { Alert } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { LoadingSpinner } from '@/shared/components/common/LoadingSpinner';
import { formatPHP } from '@/shared/utils/currency';
import { useProject } from '../api/projects.queries';
import { ProjectStatusStepper } from './ProjectStatusStepper';
import { useProjectPayments } from '@/modules/payments/api/payments.queries';
import { PaymentForm } from '@/modules/payments/components/PaymentForm';

interface InvoicesTabProps {
  projectId: string;
}

/**
 * Invoices tab: the project's proof-of-payment flow — status stepper,
 * payment-status alerts, and the payment method + proof-of-payment form.
 *
 * Two surfaces deliberately do NOT live here, and this tab links out to both
 * rather than duplicating them:
 *
 * - Quotation review (itemized cost breakdown, payment schedule, and the
 *   accept/request-changes decision) lives in the Quotations section
 *   (`modules/quotations/pages/QuotationDetailPage`), so the client sees the
 *   full cost and payment commitment in one place before accepting.
 * - Payment receipts live in the Invoices section
 *   (`modules/payments/pages/InvoicesPage`), which covers every project at
 *   once rather than making the client open each project to see what they
 *   have paid.
 *
 * Self-contained (fetches its own data via `projectId`) so Base UI's Tabs
 * only mounts it — and only fires its queries — once the client actually
 * opens this tab.
 */
export function InvoicesTab({ projectId }: InvoicesTabProps) {
  const { data: project, isLoading, isError, refetch } = useProject(projectId);
  const { data: payments } = useProjectPayments(projectId);

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

      {latestQuotation && latestQuotation.status === 'draft' && (
        <Alert
          variant="info"
          title="Your quotation is being prepared"
          description="We're reviewing your request. You'll be able to review and accept your quotation once it's ready."
        />
      )}

      {latestQuotation && latestQuotation.status === 'sent' && (
        <div className="flex flex-col items-start gap-3">
          <Alert
            className="w-full"
            variant="info"
            title="You have a quotation to review"
            description="Your cost breakdown and payment schedule are in the Quotations section."
          />
          <Link
            to={`/client/dashboard/quotations/${project.id}/${latestQuotation.id}`}
            className={buttonVariants({ size: 'sm' })}
          >
            Review your quotation
          </Link>
        </div>
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

      {latestPayment &&
        (isFullyPaid ? (
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
        ) : null)}

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
        <div className="flex flex-col items-start gap-3">
          <Alert
            className="w-full"
            variant="info"
            title="Your receipts are in the Invoices section"
            description="Every payment you've made, with what's verified and what's still outstanding."
          />
          <Link to="/client/dashboard/invoices" className={buttonVariants({ size: 'sm' })}>
            View payment receipts
          </Link>
        </div>
      )}

      {project.status_code === 'accepted' && !latestPayment && isFullyPaid && (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <p className="text-base font-semibold text-foreground">Your project has been accepted!</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            We'll be in touch shortly to schedule development.
          </p>
        </div>
      )}
    </div>
  );
}
