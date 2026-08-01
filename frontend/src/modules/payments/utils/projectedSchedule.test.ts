import { describe, it, expect } from 'vitest';

import { computeProjectedInstallments, formatProjectedDueLabel } from './projectedSchedule';

describe('computeProjectedInstallments', () => {
  it('splits a round total into the fixed 50/20/10/10/10 schedule', () => {
    const result = computeProjectedInstallments(50000);

    expect(result.map((row) => row.percentage)).toEqual([50, 20, 10, 10, 10]);
    expect(result.map((row) => row.amount)).toEqual([25000, 10000, 5000, 5000, 5000]);
    expect(result.map((row) => row.sequence)).toEqual([1, 2, 3, 4, 5]);
  });

  it('accepts a numeric string, as money arrives from the API', () => {
    const result = computeProjectedInstallments('50000.00');

    expect(result[0].amount).toBe(25000);
  });

  it('absorbs the rounding remainder on the final installment so rows sum exactly', () => {
    const result = computeProjectedInstallments(99999.99);
    const sum = result.reduce((total, row) => total + row.amount, 0);

    expect(Math.round(sum * 100) / 100).toBe(99999.99);
    expect(result[4].amount).toBe(9999.99);
  });

  it('returns no rows for a zero total', () => {
    expect(computeProjectedInstallments(0)).toEqual([]);
  });

  it('returns no rows for a negative total', () => {
    expect(computeProjectedInstallments(-100)).toEqual([]);
  });
});

describe('formatProjectedDueLabel', () => {
  it('labels the downpayment as due on acceptance', () => {
    expect(formatProjectedDueLabel(1)).toBe('On acceptance');
  });

  it('labels the second installment as one week after, singular', () => {
    expect(formatProjectedDueLabel(2)).toBe('1 week after');
  });

  it('labels later installments in plural weeks', () => {
    expect(formatProjectedDueLabel(5)).toBe('4 weeks after');
  });
});
