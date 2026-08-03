/*
  Payment-flow business constants.

  MAX_WITHHOLDING_SHORTFALL_RATE is the largest gap between an installment's
  due amount and what a client actually remits that the product will accept as
  "this is a withholding-tax deduction, not an underpayment".

  0.10 (10%) is chosen to cover the full range of Philippine creditable
  withholding tax (EWT) rates a corporate client could legitimately apply to a
  software/services invoice:

    1%  - purchases of goods
    2%  - purchases of services (the common case for this product)
    5%  - certain professional/management fees
    10% - professional fees paid to an individual payee below the VAT threshold

  Anything beyond 10% short is not a tax deduction -- it is a mistyped amount,
  a partial payment, or a client paying an installment they weren't asked for.
  All three need a human, so those are still refused with a 409 and a message
  telling the client the exact amount due.

  Deliberately a single named constant with one consumer
  (payments.service.js#createPayment): if the business later wants a different
  tolerance, this is the only line that changes. It is intentionally NOT
  configurable per client/project -- that is a settings model this pass is not
  building.
*/
const MAX_WITHHOLDING_SHORTFALL_RATE = 0.1;

module.exports = { MAX_WITHHOLDING_SHORTFALL_RATE };
