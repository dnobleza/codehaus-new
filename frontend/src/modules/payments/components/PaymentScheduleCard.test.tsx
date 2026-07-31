import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { PaymentScheduleCard } from './PaymentScheduleCard';
import { computeProjectedInstallments } from '../utils/projectedSchedule';
import type { PaymentInstallment } from '@/shared/types/payment.types';

const actualInstallments: PaymentInstallment[] = [
  {
    id: 'i-1',
    project_id: 'proj-1',
    quotation_id: 'q-1',
    sequence: 1,
    percentage: '50.00',
    amount: '25000.00',
    due_date: '2026-07-01',
    status: 'paid',
    created_at: '2026-07-01',
  },
  {
    id: 'i-2',
    project_id: 'proj-1',
    quotation_id: 'q-1',
    sequence: 2,
    percentage: '20.00',
    amount: '10000.00',
    due_date: '2099-07-08',
    status: 'pending',
    created_at: '2026-07-01',
  },
];

describe('PaymentScheduleCard', () => {
  it('renders real due dates and paid progress in actual mode', () => {
    render(<PaymentScheduleCard installments={actualInstallments} />);

    expect(screen.getByText('Payment Schedule')).toBeInTheDocument();
    expect(screen.getByText('1 of 2 paid')).toBeInTheDocument();
    expect(screen.getAllByText('Jul 1, 2026').length).toBeGreaterThan(0);
  });

  it('renders nothing when there are no installments', () => {
    const { container } = render(<PaymentScheduleCard installments={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders relative due labels and no status badges in projected mode', () => {
    render(<PaymentScheduleCard projected={computeProjectedInstallments(50000)} />);

    expect(screen.getAllByText('On acceptance').length).toBeGreaterThan(0);
    expect(screen.getAllByText('4 weeks after').length).toBeGreaterThan(0);
    expect(screen.queryByText('Pending')).not.toBeInTheDocument();
    expect(screen.queryByText('Paid')).not.toBeInTheDocument();
    expect(screen.queryByText(/of \d+ paid/)).not.toBeInTheDocument();
  });

  it('renders nothing in projected mode when the total produced no rows', () => {
    const { container } = render(<PaymentScheduleCard projected={computeProjectedInstallments(0)} />);

    expect(container).toBeEmptyDOMElement();
  });
});
