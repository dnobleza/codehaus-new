import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../api/payments.queries', () => ({ useMyInvoices: vi.fn() }));

import { useMyInvoices } from '../api/payments.queries';
import { InvoicesPage } from './InvoicesPage';
import type { ProjectInvoice } from '@/shared/types/payment.types';

const invoices: ProjectInvoice[] = [
  {
    project_id: 'proj-1',
    project_title: 'Business Package',
    amount_paid: '25000.00',
    balance_due: '10000.00',
    payments: [
      {
        id: 'p-1',
        project_id: 'proj-1',
        payment_method: 'gcash',
        amount: '25000.00',
        shortfall_amount: '0.00',
        rejection_reason: null,
        reference_number: 'REF123',
        status: 'verified',
        created_at: '2026-07-01',
        verified_at: '2026-07-02',
        installment_sequence: 1,
      },
    ],
  },
  {
    project_id: 'proj-2',
    project_title: 'Landing Page Refresh',
    amount_paid: '0.00',
    balance_due: '15000.00',
    payments: [
      {
        id: 'p-2',
        project_id: 'proj-2',
        payment_method: 'maya',
        amount: '7500.00',
        shortfall_amount: '0.00',
        rejection_reason: null,
        reference_number: null,
        status: 'verification',
        created_at: '2026-07-10',
        verified_at: null,
        installment_sequence: 1,
      },
    ],
  },
];

function mockQuery(value: unknown) {
  vi.mocked(useMyInvoices).mockReturnValue(value as ReturnType<typeof useMyInvoices>);
}

describe('InvoicesPage', () => {
  it('renders one receipt per project', () => {
    mockQuery({ data: invoices, isLoading: false, isError: false, refetch: vi.fn() });

    render(<InvoicesPage />);

    expect(screen.getAllByText('Payment Receipt')).toHaveLength(2);
    expect(screen.getByText('Business Package')).toBeInTheDocument();
    expect(screen.getByText('Landing Page Refresh')).toBeInTheDocument();
  });

  it('shows an empty state when the client has never paid', () => {
    mockQuery({ data: [], isLoading: false, isError: false, refetch: vi.fn() });

    render(<InvoicesPage />);

    expect(screen.getByText('No payments yet')).toBeInTheDocument();
    expect(screen.queryByText('Payment Receipt')).not.toBeInTheDocument();
  });

  it('shows the error state when the request fails', () => {
    mockQuery({ data: undefined, isLoading: false, isError: true, refetch: vi.fn() });

    render(<InvoicesPage />);

    expect(screen.queryByText('Payment Receipt')).not.toBeInTheDocument();
    expect(screen.queryByText('No payments yet')).not.toBeInTheDocument();
  });
});
