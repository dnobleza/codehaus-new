import type { PaymentMethod } from '@/shared/types/payment.types';

/*
  Where a client actually sends the money.

  The manual payment flow asked clients to pick a method and upload proof
  without ever telling them which account to pay into — the one piece of
  information the whole flow depends on.

  DELIBERATELY STATIC, NOT A DATABASE TABLE. There is no company-settings
  table and no admin settings UI in this product, and building one to hold
  three account numbers that change roughly never would be a settings system
  masquerading as a bug fix. This file is the same shape of small,
  typed, single-purpose shared config as `shared/utils/currency.ts`: one
  export, no I/O, trivially testable. If these details ever need to be
  admin-editable, this module becomes the fallback and the query replaces the
  constant — no consumer changes shape.

  Scope held on purpose: exactly ONE account per method. No multi-account
  support, no currency selection (this product invoices in PHP only), no
  per-project routing.

  ─────────────────────────────────────────────────────────────────────────
  TODO: REPLACE WITH REAL ACCOUNT DETAILS BEFORE THIS REACHES PRODUCTION.
  Every value below is a placeholder. A client who pays into these will send
  money nowhere. Replace the `fields` values (not the structure) and delete
  this block.
  ─────────────────────────────────────────────────────────────────────────
*/

/** One labelled line of account detail, rendered as a definition-list row. */
export interface PaymentAccountField {
  label: string;
  value: string;
  /**
   * Marks the value clients most often mistype (account/phone numbers), so the
   * UI can render it in a monospaced, easy-to-copy style. Purely presentational.
   */
  copyable?: boolean;
}

export interface PaymentAccountDetails {
  /** Heading shown above the details, e.g. "Bank transfer details". */
  title: string;
  fields: PaymentAccountField[];
  /** Method-specific instruction shown under the fields. */
  note: string;
}

/**
 * Payment account details keyed by the same `PaymentMethod` union the form's
 * radio group and the backend validator use, so a method can never be selected
 * that has no account details to show — the type checker enforces completeness.
 */
export const PAYMENT_ACCOUNTS: Record<PaymentMethod, PaymentAccountDetails> = {
  bank_transfer: {
    title: 'Bank transfer details',
    fields: [
      { label: 'Bank', value: 'TODO: Bank name' },
      { label: 'Account name', value: 'TODO: Registered account name' },
      { label: 'Account number', value: 'TODO: 0000-0000-0000', copyable: true },
    ],
    note: 'Use your project reference code as the transfer remark so we can match your payment quickly.',
  },
  gcash: {
    title: 'GCash details',
    fields: [
      { label: 'Account name', value: 'TODO: Registered GCash name' },
      { label: 'GCash number', value: 'TODO: 09XX XXX XXXX', copyable: true },
    ],
    note: 'Send via Express Send, then upload the confirmation screenshot below.',
  },
  maya: {
    title: 'Maya details',
    fields: [
      { label: 'Account name', value: 'TODO: Registered Maya name' },
      { label: 'Maya number', value: 'TODO: 09XX XXX XXXX', copyable: true },
    ],
    note: 'Send via Send Money, then upload the confirmation screenshot below.',
  },
};

/** The account details for a selected method, or `null` before one is chosen. */
export function paymentAccountFor(
  method: PaymentMethod | undefined | null,
): PaymentAccountDetails | null {
  return method ? PAYMENT_ACCOUNTS[method] : null;
}
