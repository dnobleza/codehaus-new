import { describe, it, expect } from 'vitest';

import {
  MAX_WITHHOLDING_SHORTFALL_RATE,
  checkAmountAgainstInstallment,
  shortfallOf,
} from './withholdingTax';

/*
  Client-side mirror of backend/tests/paymentAmountTolerance.test.js.

  Both sides must agree on which amounts are acceptable -- a client-side rule
  that is stricter silently blocks legitimate payments the API would take, and
  one that is looser sends the client through a file upload only to be 409'd.
  These cases deliberately duplicate the backend's so a change to one that
  isn't mirrored in the other shows up as a failing test.
*/

describe('checkAmountAgainstInstallment', () => {
  it('accepts an exact amount (the unchanged 99% path)', () => {
    expect(checkAmountAgainstInstallment('100000.00', '100000.00')).toBe('ok');
    expect(checkAmountAgainstInstallment('100000', '100000.00')).toBe('ok');
  });

  it('accepts a 2% withholding-tax shortfall — the motivating case', () => {
    expect(checkAmountAgainstInstallment('98000', '100000.00')).toBe('ok');
  });

  it('accepts every EWT rate up to the tolerance', () => {
    for (const ewt of [0.01, 0.02, 0.05, 0.1]) {
      expect(checkAmountAgainstInstallment((100000 * (1 - ewt)).toFixed(2), '100000.00')).toBe('ok');
    }
  });

  it('refuses a shortfall past the tolerance, by even one centavo', () => {
    expect(checkAmountAgainstInstallment('89999.99', '100000.00')).toBe('underpaid');
    expect(checkAmountAgainstInstallment('10000.00', '100000.00')).toBe('underpaid');
  });

  it('refuses any overpayment', () => {
    expect(checkAmountAgainstInstallment('100000.01', '100000.00')).toBe('overpaid');
  });

  it('reports invalid for unusable input', () => {
    expect(checkAmountAgainstInstallment('', '100000.00')).toBe('invalid');
    expect(checkAmountAgainstInstallment('abc', '100000.00')).toBe('invalid');
    expect(checkAmountAgainstInstallment('0', '100000.00')).toBe('invalid');
    expect(checkAmountAgainstInstallment('100000.00', '0.00')).toBe('invalid');
  });
});

describe('shortfallOf', () => {
  it('is 0 for an exact payment', () => {
    expect(shortfallOf('100000.00', '100000.00')).toBe(0);
  });

  it('computes the gap without float drift', () => {
    expect(shortfallOf('98000.00', '100000.00')).toBe(2000);
    expect(shortfallOf('0.29', '0.30')).toBe(0.01);
    expect(shortfallOf('73350.03', '81500.33')).toBe(8150.3);
  });

  it('never reports a negative shortfall for an overpayment', () => {
    expect(shortfallOf('120000.00', '100000.00')).toBe(0);
  });
});

describe('tolerance constant', () => {
  it('matches the backend constant it mirrors', () => {
    expect(MAX_WITHHOLDING_SHORTFALL_RATE).toBe(0.1);
  });
});
