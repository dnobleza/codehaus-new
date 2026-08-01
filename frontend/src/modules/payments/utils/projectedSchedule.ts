import { toNumber } from '@/shared/utils/currency';

/**
 * Mirrors `backend/src/services/quotations.service.js`'s
 * INSTALLMENT_PERCENTAGES exactly. Duplicated rather than fetched because
 * the real installment rows don't exist until the client accepts the
 * quotation — this is a preview of what the server WILL generate, shown at
 * decision time so the payment commitment is visible before acceptance.
 * If the backend schedule ever changes, this constant must change with it.
 */
const INSTALLMENT_PERCENTAGES = [50, 20, 10, 10, 10];

/** Same cent-rounding the backend's `toMoney` applies, so both sides agree to the cent. */
function toMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export interface ProjectedInstallment {
  sequence: number;
  percentage: number;
  amount: number;
}

/**
 * Projects the fixed installment schedule for a quotation total. Carries no
 * dates and no status: the server anchors real due dates to acceptance time,
 * so absolute dates cannot be known here (see `formatProjectedDueLabel`).
 *
 * Installments 1-4 round to the cent from their percentage and installment 5
 * absorbs whatever remainder is left, so the rows always sum to EXACTLY the
 * total — matching `generateInstallmentSchedule` server-side.
 *
 * Returns an empty array for a zero or negative total: a ₱0 quotation has no
 * meaningful schedule, and rendering five ₱0 rows would be misleading (see
 * the known ₱0-quote gap in CLAUDE.md).
 */
export function computeProjectedInstallments(total: number | string): ProjectedInstallment[] {
  const totalAmount = toMoney(toNumber(total));
  if (totalAmount <= 0) return [];

  const amounts = INSTALLMENT_PERCENTAGES.slice(0, -1).map((percentage) =>
    toMoney((totalAmount * percentage) / 100),
  );
  const amountSoFar = amounts.reduce((sum, amount) => sum + amount, 0);
  amounts.push(toMoney(totalAmount - amountSoFar));

  return INSTALLMENT_PERCENTAGES.map((percentage, index) => ({
    sequence: index + 1,
    percentage,
    amount: amounts[index],
  }));
}

/**
 * Relative due label for a projected installment. Deliberately relative:
 * the backend anchors due dates to schedule-generation time (i.e. the moment
 * the client accepts), so any absolute date shown before acceptance would be
 * a date the server never honors.
 */
export function formatProjectedDueLabel(sequence: number): string {
  if (sequence === 1) return 'On acceptance';
  const weeks = sequence - 1;
  return `${weeks} week${weeks === 1 ? '' : 's'} after`;
}
