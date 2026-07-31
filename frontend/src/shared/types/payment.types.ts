/** Only these three are real payment-collection methods in this product (Stripe/PayPal are catalog add-ons only). */
export type PaymentMethod = 'bank_transfer' | 'gcash' | 'maya';

export type PaymentStatus = 'pending' | 'verification' | 'verified' | 'rejected';

/**
 * Matches the presenter-shaped response from
 * `backend/src/utils/paymentPresenter.js` (never the raw row) —
 * `proof_of_payment_url` is always either `null` or the AUTHENTICATED route
 * path `/projects/{project_id}/payments/{payment_id}/proof`, never a
 * directly-fetchable static URL. Fetch it through
 * `modules/payments/api/payments.api.ts`'s `fetchProofBlobUrl` (or the
 * `useProofImageUrl` hook) so the `Authorization` header is attached —
 * a plain `<img src>` will get a 401/404, not the image.
 */
export interface Payment {
  id: string;
  project_id: string;
  /**
   * The installment this payment was submitted against, resolved server-side
   * from "the next pending installment" at submission time
   * (`payments.service.js`). Nullable because the column is nullable for
   * pre-installment-schedule rows. Present on every API response — the
   * presenter spreads the full row.
   */
  installment_id: string | null;
  payment_method: PaymentMethod;
  /** NUMERIC(12,2) as a string. */
  amount: string;
  reference_number: string | null;
  proof_of_payment_url: string | null;
  status: PaymentStatus;
  verified_by: number | string | null;
  verified_at: string | null;
  created_at: string;
}

/**
 * One payment row from `GET /payments` — the client's cross-project list
 * backing the Invoices page. Deliberately NOT a `Payment`: the list query
 * omits `proof_of_payment_url` (financial PII the page never renders) and
 * joins in `installment_sequence`, which the raw row has no column for.
 */
export interface PaymentListItem {
  id: string;
  project_id: string;
  payment_method: PaymentMethod;
  /** NUMERIC(12,2) as a string. */
  amount: string;
  reference_number: string | null;
  status: PaymentStatus;
  created_at: string;
  verified_at: string | null;
  /** `null` when the payment predates the installment schedule. */
  installment_sequence: number | null;
}

/**
 * The client's payments for one project, plus that project's totals. The
 * Invoices page renders one of these per project.
 */
export interface ProjectInvoice {
  project_id: string;
  project_title: string;
  /** Sum of `verified` payments only — money the team has confirmed. NUMERIC as a string. */
  amount_paid: string;
  /** Sum of still-pending installments, from the schedule. NUMERIC as a string. */
  balance_due: string;
  payments: PaymentListItem[];
}

export type PaymentInstallmentStatus = 'pending' | 'paid';

/**
 * Matches the raw `payment_installments` row shape from
 * `backend/src/repositories/paymentInstallments.repository.js` (a bare
 * `SELECT * ... ORDER BY sequence ASC`, no presenter).
 */
export interface PaymentInstallment {
  id: string;
  project_id: string;
  quotation_id: string;
  sequence: number;
  /** NUMERIC(5,2) as a string. */
  percentage: string;
  /** NUMERIC(12,2) as a string. */
  amount: string;
  /** DATE as a string (e.g. "2026-07-18"). */
  due_date: string;
  status: PaymentInstallmentStatus;
  created_at: string;
}
