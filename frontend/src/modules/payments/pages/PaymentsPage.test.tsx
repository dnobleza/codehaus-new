import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../api/payments.queries', async () => ({
  useDuePayments: vi.fn(),
  useSubmitPayment: vi.fn(() => ({ mutate: vi.fn(), isPending: false, error: null })),
}));

import { useDuePayments } from '../api/payments.queries';
import { PaymentsPage } from './PaymentsPage';
import type { DuePayment } from '@/shared/types/payment.types';

function due(overrides: Partial<DuePayment> = {}): DuePayment {
  return {
    project_id: 'proj-1',
    project_title: 'Business Package',
    awaiting_verification: false,
    installment: {
      id: 'i-1',
      project_id: 'proj-1',
      quotation_id: 'q-1',
      sequence: 1,
      percentage: '50.00',
      amount: '25000.00',
      due_date: '2026-07-01',
      status: 'pending',
      created_at: '2026-07-01',
    },
    ...overrides,
  };
}

function mockQuery(value: unknown) {
  vi.mocked(useDuePayments).mockReturnValue(value as ReturnType<typeof useDuePayments>);
}

describe('PaymentsPage', () => {
  it('renders the payment form for each outstanding installment', () => {
    mockQuery({ data: [due()], isLoading: false, isError: false, refetch: vi.fn() });

    render(<PaymentsPage />);

    expect(screen.getByText('Business Package')).toBeInTheDocument();
    expect(screen.getByText(/Downpayment/)).toBeInTheDocument();
    expect(screen.getAllByText('₱25,000').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /submit payment/i })).toBeInTheDocument();
  });

  it('blocks submission while a previous payment is under verification', () => {
    mockQuery({
      data: [due({ awaiting_verification: true })],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<PaymentsPage />);

    expect(screen.getByText('Payment under verification')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /submit payment/i })).not.toBeInTheDocument();
  });

  it('shows an empty state when nothing is owed', () => {
    mockQuery({ data: [], isLoading: false, isError: false, refetch: vi.fn() });

    render(<PaymentsPage />);

    expect(screen.getByText('Nothing due right now')).toBeInTheDocument();
  });

  it('renders one card per project with an outstanding installment', () => {
    mockQuery({
      data: [
        due(),
        due({
          project_id: 'proj-2',
          project_title: 'Landing Page Refresh',
          installment: { ...due().installment, id: 'i-2', project_id: 'proj-2' },
        }),
      ],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<PaymentsPage />);

    expect(screen.getByText('Business Package')).toBeInTheDocument();
    expect(screen.getByText('Landing Page Refresh')).toBeInTheDocument();
  });
});
