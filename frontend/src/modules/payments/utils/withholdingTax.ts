import { toCentavos } from '@/shared/utils/currency';

/**
 * Largest shortfall the API will accept as a withholding-tax deduction rather
 * than an underpayment.
 *
 * MUST stay in sync with `MAX_WITHHOLDING_SHORTFALL_RATE` in
 * `backend/src/constants/payments.js` — 10%, covering every Philippine
 * creditable withholding tax (EWT) rate applicable to a services invoice
 * (1% goods, 2% services, 5%/10% professional fees).
 *
 * This is a client-side MIRROR, never the authority: the server re-checks the
 * amount against the installment inside the submission transaction. Validating
 * here only exists so a client learns the amount is out of range before
 * uploading a proof file, instead of after a round trip.
 */
export const MAX_WITHHOLDING_SHORTFALL_RATE = 0.1;

export type AmountCheck = 'ok' | 'overpaid' | 'underpaid' | 'invalid';

/**
 * Checks a client-entered amount against the installment's due amount, in
 * integer centavos. Mirrors `classifyInstallmentPayment` in
 * `backend/src/utils/money.js`, collapsed to what the form needs: 'ok' covers
 * both the exact amount and an in-tolerance shortfall, since the form treats
 * them identically (submit is enabled either way).
 */
export function checkAmountAgainstInstallment(
  amount: number | string | null | undefined,
  dueAmount: number | string | null | undefined,
): AmountCheck {
  const paidCentavos = toCentavos(amount);
  const dueCentavos = toCentavos(dueAmount);

  if (paidCentavos === null || dueCentavos === null || dueCentavos <= 0 || paidCentavos <= 0) {
    return 'invalid';
  }
  if (paidCentavos > dueCentavos) return 'overpaid';
  if (dueCentavos - paidCentavos > Math.round(dueCentavos * MAX_WITHHOLDING_SHORTFALL_RATE)) {
    return 'underpaid';
  }
  return 'ok';
}

/** The shortfall between due and paid, in pesos. 0 when the amount is exact or invalid. */
export function shortfallOf(
  amount: number | string | null | undefined,
  dueAmount: number | string | null | undefined,
): number {
  const paidCentavos = toCentavos(amount);
  const dueCentavos = toCentavos(dueAmount);
  if (paidCentavos === null || dueCentavos === null) return 0;
  return Math.max(0, dueCentavos - paidCentavos) / 100;
}
