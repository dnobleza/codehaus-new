/*
  Money comparison helpers.

  Every money column in this schema is NUMERIC(12,2) and the `pg` driver
  returns NUMERIC as a STRING, not a number. Comparing those values by
  converting to JS floats and testing with `===` (which is what
  payments.service.js used to do) is unsound: 0.1 + 0.2 !== 0.3, and
  Number('98000.00') - Number('100000.00') can land a hair off an exact
  integer. `quotations.service.js`'s `toMoney` already papers over this with
  Math.round(x * 100) / 100 -- correct enough for producing a value to store,
  but it still hands back a float, so it is the wrong tool for a COMPARISON.

  The rule in this module: convert to integer centavos ONCE, at the boundary,
  then never leave integer space. Two amounts are equal iff their centavo
  integers are equal. This is the same technique `toMoney` implies, taken one
  step further by not converting back to a float.

  Scope: NUMERIC(12,2) tops out at 10 billion pesos = 1e12 centavos, which is
  far inside Number.MAX_SAFE_INTEGER (9.007e15), so integer centavos are exact
  for every value this schema can hold.
*/

/**
 * Converts a peso amount -- a NUMERIC string from `pg`, or a plain number --
 * into an exact integer number of centavos.
 *
 * Returns `null` for values that are not finite numbers (null, undefined, '',
 * 'abc'), so callers can reject bad input explicitly rather than silently
 * treating it as 0.
 *
 * @param {string|number|null|undefined} value
 * @returns {number|null} integer centavos, or null if `value` isn't numeric
 */
function toCentavos(value) {
  if (value === null || value === undefined || value === '') return null;
  const asNumber = Number(value);
  if (!Number.isFinite(asNumber)) return null;
  // Math.round (not trunc/floor) so a float that arrives a hair below its
  // intended value (98999.999999999) still lands on the right centavo.
  return Math.round(asNumber * 100);
}

/**
 * Converts integer centavos back to a NUMERIC(12,2)-safe decimal STRING.
 * A string, not a number, so the value handed to `pg` never round-trips
 * through a float on its way into the column.
 *
 * @param {number} centavos
 * @returns {string} e.g. "2000.00"
 */
function toAmountString(centavos) {
  return (centavos / 100).toFixed(2);
}

/**
 * Classifies a client-submitted payment against the installment it is being
 * applied to. Pure and side-effect free -- all the money arithmetic for
 * `payments.service.js#createPayment` lives here so it can be unit-tested
 * without a database (this backend's tests never execute real SQL).
 *
 * Outcomes:
 *   'exact'      - paid exactly the amount due. The pre-existing 99% path;
 *                  shortfall is "0.00" and behavior is unchanged.
 *   'shortfall'  - paid LESS than due, by no more than `maxShortfallRate` of
 *                  the due amount. Treated as a withholding-tax deduction:
 *                  accepted, with the gap recorded on the payment.
 *   'underpaid'  - paid less than due by MORE than the tolerance. Refused.
 *   'overpaid'   - paid more than due. Refused (out of scope: overpayment is
 *                  a refund/credit-note problem, not a tax one).
 *   'invalid'    - either amount isn't a usable number, or the due amount is
 *                  not positive.
 *
 * @param {string|number} paidAmount   the client-submitted amount
 * @param {string|number} dueAmount    payment_installments.amount
 * @param {number} maxShortfallRate    fraction of due, e.g. 0.1 for 10%
 * @returns {{ outcome: string, shortfall: string, dueAmount: string }}
 */
function classifyInstallmentPayment(paidAmount, dueAmount, maxShortfallRate) {
  const paidCentavos = toCentavos(paidAmount);
  const dueCentavos = toCentavos(dueAmount);

  if (paidCentavos === null || dueCentavos === null || dueCentavos <= 0) {
    return { outcome: 'invalid', shortfall: '0.00', dueAmount: '0.00' };
  }

  const due = toAmountString(dueCentavos);

  if (paidCentavos > dueCentavos) {
    return { outcome: 'overpaid', shortfall: '0.00', dueAmount: due };
  }
  if (paidCentavos === dueCentavos) {
    return { outcome: 'exact', shortfall: '0.00', dueAmount: due };
  }

  const shortfallCentavos = dueCentavos - paidCentavos;
  // Rounded (not floored) so a tolerance boundary that lands on a half-centavo
  // resolves in the client's favor rather than rejecting a legitimate remittance
  // by one centavo.
  const maxShortfallCentavos = Math.round(dueCentavos * maxShortfallRate);

  if (shortfallCentavos > maxShortfallCentavos) {
    return { outcome: 'underpaid', shortfall: toAmountString(shortfallCentavos), dueAmount: due };
  }

  return { outcome: 'shortfall', shortfall: toAmountString(shortfallCentavos), dueAmount: due };
}

module.exports = { toCentavos, toAmountString, classifyInstallmentPayment };
