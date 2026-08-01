import type { BadgeProps } from '@/components/ui/badge';
import type { PaymentMethod, PaymentStatus } from '@/shared/types/payment.types';

/**
 * Shared display mappings for the payment domain. Extracted here because
 * `PaymentReceiptCard` (quotation breakdown) and `PaymentHistoryReceipt`
 * (money actually paid) both render payment status and method, and two
 * copies would inevitably drift apart in wording.
 */

export const PAYMENT_STATUS_BADGE: Record<PaymentStatus, BadgeProps['variant']> = {
  pending: 'neutral',
  verification: 'warning',
  verified: 'success',
  rejected: 'danger',
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: 'Pending',
  verification: 'Under Verification',
  verified: 'Verified',
  rejected: 'Rejected — please resubmit',
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  bank_transfer: 'Bank Transfer',
  gcash: 'GCash',
  maya: 'Maya',
};

/**
 * Sequence 1 is always the 50% downpayment; sequences 2-5 are the
 * 20%/10%/10%/10% weekly installments that follow (see the fixed schedule in
 * `backend/src/services/quotations.service.js`). Labeling by literal sequence
 * number rather than hardcoding a count of 5 keeps this correct even if the
 * schedule shape ever changes server-side.
 */
export function getInstallmentLabel(sequence: number): string {
  return sequence === 1 ? 'Downpayment' : `Installment ${sequence}`;
}
