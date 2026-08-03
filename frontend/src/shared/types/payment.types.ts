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
  /**
   * How far this payment fell short of the installment's due amount, as a
   * NUMERIC(12,2) string. "0.00" for the overwhelming majority — an exact
   * payment. A non-zero value is a withholding-tax deduction the client
   * remitted to the BIR instead (see `modules/payments/utils/withholdingTax.ts`
   * and migration 027); it is NOT an outstanding balance.
   */
  shortfall_amount: string;
  reference_number: string | null;
  proof_of_payment_url: string | null;
  status: PaymentStatus;
  /**
   * Why an admin refused this payment. Non-null only on `rejected` payments —
   * and even then nullable, since rejections recorded before migration 028 have
   * no reason stored. Surfaced to the client so they know what to fix before
   * resubmitting.
   */
  rejection_reason: string | null;
  verified_by: number | string | null;
  verified_at: string | null;
  created_at: string;
  /**
   * Context joined in on the admin/staff verification queue only
   * (`payments.repository.js`'s PAYMENT_WITH_CONTEXT_SELECT). Absent on the
   * client's own payment reads.
   *
   * All nullable — every join is a LEFT JOIN so a payment never drops out of
   * the verification queue because a related row is missing, and
   * `installment_id` is itself nullable for rows predating the installment
   * schedule. Render through `paymentClientName()` / with fallbacks.
   */
  project_title?: string | null;
  project_reference_code?: string | null;
  client_first_name?: string | null;
  client_last_name?: string | null;
  installment_sequence?: number | null;
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
  /** Withholding-tax gap vs. the installment's due amount; "0.00" when exact. See `Payment`. */
  shortfall_amount: string;
  /** Why the payment was refused; only meaningful when `status === 'rejected'`. See `Payment`. */
  rejection_reason: string | null;
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
 * One outstanding payment from `GET /payments/due` — the next installment owed
 * on a project, with the project it belongs to. The client's Payments page
 * renders one payment form per entry.
 */
export interface DuePayment {
  project_id: string;
  project_title: string;
  /**
   * `true` when a previous submission on this project is still being checked
   * by the team. The client must not submit again until it clears — resolved
   * server-side so the rule has one source of truth.
   */
  awaiting_verification: boolean;
  /** The exact installment a submission would settle. */
  installment: PaymentInstallment;
}

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
