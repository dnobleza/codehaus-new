import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPHP } from '@/shared/utils/currency';
import type { Payment, PaymentStatus, PaymentMethod } from '@/shared/types/payment.types';
import type { Project } from '@/shared/types/project.types';
import type { Quotation } from '@/shared/types/quotation.types';
import { usePackage } from '@/modules/packages/api/packages.queries';
import { PaymentScheduleCard } from './PaymentScheduleCard';
import codehausLogo from '@/assets/codehaus-logo.svg';

const PAYMENT_STATUS_BADGE: Record<PaymentStatus, BadgeProps['variant']> = {
  pending: 'neutral',
  verification: 'warning',
  verified: 'success',
  rejected: 'danger',
};

const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: 'Pending',
  verification: 'Under Verification',
  verified: 'Verified',
  rejected: 'Rejected — please resubmit',
};

const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  bank_transfer: 'Bank Transfer',
  gcash: 'GCash',
  maya: 'Maya',
};

interface PaymentReceiptCardProps {
  project: Project;
  quotation: Quotation | undefined;
  payment: Payment | undefined;
}

/**
 * E-receipt style summary of an accepted quotation: branded header,
 * itemized price breakdown, the package's included pages, the full
 * installment schedule, and the client's latest payment status. Shows no
 * uploaded proof-of-payment image and no standalone "verified" icon —
 * status is conveyed by the Badge alone, per design-system.md's
 * icon+label rule. Renders nothing before a quotation has been accepted.
 */
export function PaymentReceiptCard({ project, quotation, payment }: PaymentReceiptCardProps) {
  const { data: pkg } = usePackage(project.package_id ?? undefined);

  if (!quotation || quotation.status !== 'accepted') return null;

  const addonLines = quotation.addons ?? [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={codehausLogo} alt="CodeHaus" className="h-8 w-auto" />
            <CardTitle>Payment Receipt</CardTitle>
          </div>
          <span className="text-sm font-medium text-muted-foreground">
            {quotation.quotation_number}
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-semibold text-muted-foreground">Breakdown</p>
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground">Base Package: {project.title}</span>
            <span className="font-medium text-foreground">{formatPHP(quotation.base_price)}</span>
          </div>
          {addonLines.map((line) => (
            <div key={line.addonId} className="flex items-center justify-between text-sm">
              <span className="text-foreground">{line.name}</span>
              <span className="font-medium text-foreground">{formatPHP(line.priceAtTime)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-border pt-2">
            <span className="text-base font-semibold text-foreground">Total</span>
            <span className="text-xl font-bold text-foreground">
              {formatPHP(quotation.total_amount)}
            </span>
          </div>
        </div>

        {pkg && pkg.pages.length > 0 && (
          <div className="flex flex-col gap-1.5 border-t border-border pt-4">
            <p className="text-xs font-semibold text-muted-foreground">Pages Included</p>
            <p className="text-sm text-foreground">
              {pkg.pages.map((page) => page.name).join(', ')}
            </p>
          </div>
        )}

        <div className="border-t border-border pt-4">
          <PaymentScheduleCard installments={project.paymentInstallments} />
        </div>

        {payment && (
          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground">Latest Payment</p>
              <Badge variant={PAYMENT_STATUS_BADGE[payment.status]}>
                {PAYMENT_STATUS_LABEL[payment.status]}
              </Badge>
            </div>
            <dl className="grid grid-cols-2 gap-y-1 text-sm">
              <dt className="text-muted-foreground">Amount</dt>
              <dd className="text-right font-medium text-foreground">
                {formatPHP(payment.amount)}
              </dd>
              <dt className="text-muted-foreground">Method</dt>
              <dd className="text-right font-medium text-foreground">
                {PAYMENT_METHOD_LABEL[payment.payment_method]}
              </dd>
              <dt className="text-muted-foreground">Reference number</dt>
              <dd className="text-right font-medium text-foreground">
                {payment.reference_number ?? '—'}
              </dd>
            </dl>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
