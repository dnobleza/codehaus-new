/*
  Money-precision tests for the withholding-tax tolerance
  (utils/money.js + constants/payments.js).

  This is the highest-risk change in the payment flow: it relaxes a check that
  used to be strict equality, on values that arrive from `pg` as NUMERIC
  strings. The backend test suite never executes real SQL, so the arithmetic is
  tested here in isolation -- which is exactly why the arithmetic was extracted
  into a pure function instead of living inline in the service.

  The single most important guarantee is the first block: an exact-amount
  payment, the 99% case, must behave precisely as it did before this change.
*/
import { describe, it, expect } from 'vitest';
// The source under test is CommonJS; Vitest test files in this suite are ESM
// (see adminAuthorization.test.js). Default-importing the module object is how
// Node's CJS/ESM interop exposes `module.exports` here.
import money from '../src/utils/money.js';
import paymentConstants from '../src/constants/payments.js';

const { toCentavos, toAmountString, classifyInstallmentPayment } = money;
const { MAX_WITHHOLDING_SHORTFALL_RATE } = paymentConstants;

const RATE = MAX_WITHHOLDING_SHORTFALL_RATE;
const classify = (paid, due, rate = RATE) => classifyInstallmentPayment(paid, due, rate);

describe('toCentavos', () => {
  it('converts NUMERIC strings from pg exactly', () => {
    expect(toCentavos('100000.00')).toBe(10000000);
    expect(toCentavos('0.01')).toBe(1);
    expect(toCentavos('81500.50')).toBe(8150050);
  });

  it('converts plain numbers exactly', () => {
    expect(toCentavos(98000)).toBe(9800000);
    expect(toCentavos(0.1 + 0.2)).toBe(30); // the classic float case: 0.30000000000000004
  });

  it('returns null for non-numeric input rather than silently yielding 0', () => {
    for (const bad of [null, undefined, '', 'abc', NaN, Infinity]) {
      expect(toCentavos(bad)).toBeNull();
    }
  });
});

describe('toAmountString', () => {
  it('renders centavos as a NUMERIC(12,2)-safe decimal string', () => {
    expect(toAmountString(200000)).toBe('2000.00');
    expect(toAmountString(1)).toBe('0.01');
    expect(toAmountString(0)).toBe('0.00');
  });
});

describe('classifyInstallmentPayment - exact amounts (unchanged behavior)', () => {
  it('accepts an exact match with a zero shortfall', () => {
    const result = classify('100000.00', '100000.00');
    expect(result.outcome).toBe('exact');
    expect(result.shortfall).toBe('0.00');
  });

  it('accepts an exact match when the amount arrives as a number, not a string', () => {
    expect(classify(100000, '100000.00').outcome).toBe('exact');
  });

  it('accepts an exact match on an amount with centavos', () => {
    expect(classify('81500.33', '81500.33').outcome).toBe('exact');
  });

  it('treats trailing-zero string differences as equal (100000 vs 100000.00)', () => {
    expect(classify('100000', '100000.00').outcome).toBe('exact');
  });
});

describe('classifyInstallmentPayment - withholding-tax shortfalls', () => {
  it('accepts the motivating case: 2% EWT on a 100,000 installment', () => {
    const result = classify('98000.00', '100000.00');
    expect(result.outcome).toBe('shortfall');
    expect(result.shortfall).toBe('2000.00');
    expect(result.dueAmount).toBe('100000.00');
  });

  it('accepts 1% and 5% EWT deductions', () => {
    expect(classify('99000.00', '100000.00').outcome).toBe('shortfall');
    expect(classify('95000.00', '100000.00').outcome).toBe('shortfall');
  });

  it('accepts a shortfall exactly at the tolerance boundary', () => {
    const result = classify('90000.00', '100000.00');
    expect(result.outcome).toBe('shortfall');
    expect(result.shortfall).toBe('10000.00');
  });

  it('refuses a shortfall one centavo beyond the boundary', () => {
    expect(classify('89999.99', '100000.00').outcome).toBe('underpaid');
  });

  it('refuses a grossly short payment (a mistyped amount)', () => {
    expect(classify('10000.00', '100000.00').outcome).toBe('underpaid');
    expect(classify('0.01', '100000.00').outcome).toBe('underpaid');
  });

  it('computes the shortfall without float drift on awkward amounts', () => {
    // 0.1 + 0.2 arithmetic in float space would produce 8155.000000000002.
    expect(classify('73350.03', '81500.33').shortfall).toBe('8150.30');
    expect(classify('0.29', '0.30').shortfall).toBe('0.01');
  });
});

describe('classifyInstallmentPayment - refused outcomes', () => {
  it('refuses any overpayment, even by one centavo', () => {
    expect(classify('100000.01', '100000.00').outcome).toBe('overpaid');
    expect(classify('150000.00', '100000.00').outcome).toBe('overpaid');
  });

  it('reports invalid for unusable amounts', () => {
    expect(classify('abc', '100000.00').outcome).toBe('invalid');
    expect(classify(null, '100000.00').outcome).toBe('invalid');
  });

  it('reports invalid for a non-positive due amount (the ₱0-quote edge case)', () => {
    expect(classify('0.00', '0.00').outcome).toBe('invalid');
    expect(classify('0.00', null).outcome).toBe('invalid');
  });
});

describe('MAX_WITHHOLDING_SHORTFALL_RATE', () => {
  it('covers every Philippine EWT rate up to 10%', () => {
    expect(RATE).toBe(0.1);
    for (const ewt of [0.01, 0.02, 0.05, 0.1]) {
      const net = (100000 * (1 - ewt)).toFixed(2);
      expect(classify(net, '100000.00').outcome).toBe('shortfall');
    }
  });
});
