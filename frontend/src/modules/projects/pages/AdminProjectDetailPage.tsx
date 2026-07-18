import { useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { LoadingSpinner } from '@/shared/components/common/LoadingSpinner';
import type { ApiError } from '@/shared/api/apiClient';
import { formatPHP } from '@/shared/utils/currency';
import type { ProjectStatusCode } from '@/shared/types/project.types';
import { useAdminPackages } from '@/modules/packages/api/packages.queries';
import { useAdminPayments, useRejectPayment, useVerifyPayment } from '@/modules/payments/api/payments.queries';
import { PaymentProofPreview } from '@/modules/payments/components/PaymentProofPreview';
import { PaymentScheduleCard } from '@/modules/payments/components/PaymentScheduleCard';
import {
  useAcceptProject,
  useAdminProject,
  useDeclineProject,
  useMarkProjectDelivered,
  useUpdateProjectStatus,
} from '../api/projects.queries';
import { AdminQuotationBuilder } from '../components/AdminQuotationBuilder';
import { ProjectStatusStepper } from '../components/ProjectStatusStepper';
import {
  PROJECT_STATUS_LABELS,
  getSelectableNextStatuses,
} from '../utils/projectStatus';

const QUOTATION_STATUS_BADGE = {
  draft: 'neutral',
  sent: 'primary',
  accepted: 'success',
  rejected: 'danger',
  expired: 'neutral',
} as const;

const PAYMENT_STATUS_BADGE = {
  pending: 'neutral',
  verification: 'warning',
  verified: 'success',
  rejected: 'danger',
} as const;

/**
 * Admin/staff project detail — a dedicated page rather than a Drawer.
 *
 * Decision: this view combines the client's request, a quotation
 * builder/history, a status-change control, AND a payment verification
 * panel — considerably more content than design-system.md §2.7's 560px
 * record-detail Drawer comfortably fits (the quotation builder alone
 * embeds the full `AddonCatalog`, which the client-side flow already
 * renders as a full page for the same reason). Mounted at both
 * `/admin/dashboard/projects/:id` and `/staff/dashboard/projects/:id`.
 */
export function AdminProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const basePath = location.pathname.startsWith('/staff') ? '/staff/dashboard' : '/admin/dashboard';

  const { data: project, isLoading, isError, refetch } = useAdminProject(id);
  const { data: packages } = useAdminPackages();
  const { data: allPayments } = useAdminPayments();

  const [showQuotationBuilder, setShowQuotationBuilder] = useState(false);
  const [nextStatus, setNextStatus] = useState<ProjectStatusCode | null>(null);
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  const updateStatus = useUpdateProjectStatus(id ?? '');
  const acceptProject = useAcceptProject(id ?? '');
  const declineProject = useDeclineProject(id ?? '');
  const verifyPayment = useVerifyPayment(id);
  const rejectPayment = useRejectPayment(id);
  const markDelivered = useMarkProjectDelivered(id ?? '');

  const projectPayments = useMemo(
    () => (allPayments ?? []).filter((payment) => payment.project_id === id),
    [allPayments, id],
  );
  const latestPayment = projectPayments[0];

  if (isLoading) return <LoadingSpinner label="Loading project..." />;
  if (isError || !project) {
    return <ErrorState description="We couldn't load this project." onRetry={() => refetch()} />;
  }

  const quotations = project.quotations ?? [];
  const latestQuotation = quotations[0];
  const pkg = project.package_id ? packages?.find((p) => p.id === project.package_id) : undefined;
  const packageName = project.package_id ? pkg?.name ?? 'Package' : 'Custom project';

  // A custom project (no package, or a package flagged custom) has no fixed
  // base price — its price is set later via the quotation. For a standard
  // package we show its list price. While packages are still loading we skip
  // the price line rather than flash ₱0.
  const isCustomPackage = !project.package_id || (pkg?.is_custom ?? false);
  const packagePriceLabel = isCustomPackage
    ? 'Custom — price set via quotation'
    : pkg
      ? formatPHP(pkg.base_price)
      : null;

  // Accept/Decline own the 'submitted' transition. While submitted, the
  // generic status Select and the quotation builder are both suppressed —
  // the admin must Accept first (-> under_review) before preparing a quotation.
  const isSubmitted = project.status_code === 'submitted';
  const isCancelled = project.status_code === 'cancelled';
  const isDelivered = project.status_code === 'delivered' || project.status_code === 'completed';

  const needsQuotationAction =
    !isSubmitted && !isCancelled && (!latestQuotation || latestQuotation.status === 'draft');
  const canPrepareRevision = latestQuotation?.status === 'rejected';

  const statusOptions = getSelectableNextStatuses(project.status_code);
  const statusError = updateStatus.error as ApiError | null;
  const reviewError = (acceptProject.error ?? declineProject.error) as ApiError | null;
  const isReviewPending = acceptProject.isPending || declineProject.isPending;

  // Delivery is only legal once every installment on the payment schedule
  // has been paid. `totalInstallments === 0` means the schedule hasn't even
  // been created yet (no accepted quotation with a downpayment made) — that
  // case is surfaced via helper text on the Delivery card rather than
  // hiding the card outright, since it reads more clearly than a card that
  // silently disappears depending on payment progress.
  const totalInstallments = project.paymentInstallments?.length ?? 0;
  const pendingInstallments =
    project.paymentInstallments?.filter((installment) => installment.status === 'pending').length ?? 0;
  const canDeliver = totalInstallments > 0 && pendingInstallments === 0;
  const deliverError = markDelivered.error as ApiError | null;

  function handleUpdateStatus() {
    if (!nextStatus || nextStatus === project?.status_code) return;
    updateStatus.mutate(nextStatus, { onSuccess: () => setNextStatus(null) });
  }

  function handleDecline() {
    if (declineReason.trim().length === 0) return;
    declineProject.mutate(declineReason.trim(), {
      onSuccess: () => {
        setShowDeclineForm(false);
        setDeclineReason('');
      },
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          to={`${basePath}/projects`}
          className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to projects
        </Link>
        <h1 className="text-2xl font-bold text-foreground">{project.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Client #{project.client_id} &middot; {packageName}
          {packagePriceLabel && <> &middot; {packagePriceLabel}</>}
        </p>
        {project.request_details && (
          <p className="mt-2 max-w-2xl text-sm text-foreground">{project.request_details}</p>
        )}
      </div>

      <Card>
        <CardContent>
          <ProjectStatusStepper status={project.status_code} />
        </CardContent>
      </Card>

      {isSubmitted && (
        <Card>
          <CardHeader>
            <CardTitle>Review request</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {reviewError && (
              <Alert variant="danger" title="Couldn't update this request" description={reviewError.message} />
            )}
            <p className="text-xs text-muted-foreground">
              Accept to begin reviewing this request (moves it to Under Review, where you can prepare a
              quotation), or decline it with a reason the client will see.
            </p>

            {!showDeclineForm ? (
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => acceptProject.mutate()} disabled={isReviewPending}>
                  {acceptProject.isPending ? 'Accepting...' : 'Accept request'}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setShowDeclineForm(true)}
                  disabled={isReviewPending}
                >
                  Decline
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <Textarea
                  label="Reason for declining"
                  value={declineReason}
                  onChange={(event) => setDeclineReason(event.target.value)}
                  placeholder="Let the client know why this request can't proceed."
                  disabled={declineProject.isPending}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDeclineForm(false);
                      setDeclineReason('');
                    }}
                    disabled={declineProject.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDecline}
                    disabled={declineProject.isPending || declineReason.trim().length === 0}
                  >
                    {declineProject.isPending ? 'Declining...' : 'Confirm decline'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!isSubmitted && (
      <Card>
        <CardHeader>
          <CardTitle>Update status</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {statusError && <Alert variant="danger" title="Couldn't update status" description={statusError.message} />}
          <p className="text-xs text-muted-foreground">
            Only sensible next steps are offered here; the API itself does not enforce a transition
            graph, but jumping straight from "Draft" to "Completed" would be a confusing admin action.
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <div className="w-64">
              <Select
                label="New status"
                value={nextStatus ?? project.status_code}
                onChange={(event) => setNextStatus(event.target.value as ProjectStatusCode)}
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {PROJECT_STATUS_LABELS[status]}
                  </option>
                ))}
              </Select>
            </div>
            <Button
              onClick={handleUpdateStatus}
              disabled={updateStatus.isPending || !nextStatus || nextStatus === project.status_code}
            >
              {updateStatus.isPending ? 'Updating...' : 'Update status'}
            </Button>
          </div>
        </CardContent>
      </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Quotation</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {latestQuotation && latestQuotation.status !== 'draft' && (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{latestQuotation.quotation_number}</p>
                <p className="text-xs text-muted-foreground">
                  {formatPHP(latestQuotation.total_amount)} &middot;{' '}
                  {new Date(latestQuotation.created_at).toLocaleDateString()}
                </p>
              </div>
              <Badge variant={QUOTATION_STATUS_BADGE[latestQuotation.status]}>
                {latestQuotation.status.charAt(0).toUpperCase() + latestQuotation.status.slice(1)}
              </Badge>
            </div>
          )}

          {needsQuotationAction && (
            <AdminQuotationBuilder
              projectId={project.id}
              projectPackageId={project.package_id}
              draftQuotation={latestQuotation?.status === 'draft' ? latestQuotation : undefined}
            />
          )}

          {!needsQuotationAction && canPrepareRevision && !showQuotationBuilder && (
            <Button variant="outline" className="self-start" onClick={() => setShowQuotationBuilder(true)}>
              Prepare a new quotation
            </Button>
          )}

          {!needsQuotationAction && canPrepareRevision && showQuotationBuilder && (
            <AdminQuotationBuilder
              projectId={project.id}
              projectPackageId={project.package_id}
              onDone={() => setShowQuotationBuilder(false)}
            />
          )}

          {!needsQuotationAction && !canPrepareRevision && (
            <p className="text-sm text-muted-foreground">
              Waiting on the client to respond, or the quotation has already been actioned.
            </p>
          )}

          {quotations.length > 1 && (
            <div className="flex flex-col gap-2 border-t border-border pt-3">
              <p className="text-xs font-semibold text-muted-foreground">Quotation history</p>
              {quotations.map((quotation) => (
                <div key={quotation.id} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{quotation.quotation_number}</span>
                  <span className="text-muted-foreground">{formatPHP(quotation.total_amount)}</span>
                  <Badge variant={QUOTATION_STATUS_BADGE[quotation.status]}>{quotation.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <PaymentScheduleCard installments={project.paymentInstallments} />

      {latestPayment && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Payment verification</CardTitle>
              <Badge variant={PAYMENT_STATUS_BADGE[latestPayment.status]}>{latestPayment.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-muted-foreground">Amount</dt>
              <dd className="text-right font-medium text-foreground">{formatPHP(latestPayment.amount)}</dd>
              <dt className="text-muted-foreground">Method</dt>
              <dd className="text-right font-medium text-foreground uppercase">{latestPayment.payment_method}</dd>
              <dt className="text-muted-foreground">Reference number</dt>
              <dd className="text-right font-medium text-foreground">{latestPayment.reference_number ?? '—'}</dd>
            </dl>
            <PaymentProofPreview proofUrl={latestPayment.proof_of_payment_url} />

            {latestPayment.status === 'verification' && (
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => rejectPayment.mutate(latestPayment.id)}
                  disabled={verifyPayment.isPending || rejectPayment.isPending}
                >
                  Reject
                </Button>
                <Button
                  onClick={() => verifyPayment.mutate(latestPayment.id)}
                  disabled={verifyPayment.isPending || rejectPayment.isPending}
                >
                  {verifyPayment.isPending ? 'Verifying...' : 'Verify payment'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!isSubmitted && !isCancelled && (
        <Card>
          <CardHeader>
            <CardTitle>Delivery</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {isDelivered ? (
              <div className="flex items-center gap-2 text-sm font-medium text-success">
                <CheckCircle2 className="size-4" aria-hidden="true" />
                Delivered
              </div>
            ) : (
              <>
                {deliverError && (
                  <Alert
                    variant="danger"
                    title="Couldn't mark as delivered"
                    description={deliverError.message}
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  {totalInstallments === 0
                    ? 'No payment schedule yet — nothing to deliver against.'
                    : pendingInstallments > 0
                      ? `${pendingInstallments} installment${pendingInstallments === 1 ? '' : 's'} remaining before this project can be delivered.`
                      : 'All installments paid — ready to deliver.'}
                </p>
                <Button
                  className="self-start"
                  onClick={() => markDelivered.mutate()}
                  disabled={!canDeliver || markDelivered.isPending}
                >
                  {markDelivered.isPending ? 'Marking as delivered...' : 'Mark as delivered'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default AdminProjectDetailPage;
