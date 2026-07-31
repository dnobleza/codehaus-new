import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../api/projects.queries', () => ({ useProject: vi.fn() }));
vi.mock('@/modules/payments/api/payments.queries', () => ({ useProjectPayments: vi.fn() }));

import { useProject } from '../api/projects.queries';
import { useProjectPayments } from '@/modules/payments/api/payments.queries';
import { InvoicesTab } from './InvoicesTab';
import type { Project } from '@/shared/types/project.types';
import type { Quotation } from '@/shared/types/quotation.types';

const quotation: Quotation = {
  id: 'q-1',
  quotation_number: 'QUO-0001',
  project_id: 'proj-1',
  package_id: 'pkg-1',
  base_price: '45000.00',
  estimated_timeline_min_days: 14,
  estimated_timeline_max_days: 21,
  discount_amount: '0.00',
  total_amount: '50000.00',
  status: 'sent',
  created_at: '2026-07-01',
  sent_at: '2026-07-01',
  responded_at: null,
  addons: [],
};

const project: Project = {
  id: 'proj-1',
  client_id: 1,
  package_id: 'pkg-1',
  title: 'Business Package',
  request_details: null,
  status_code: 'quotation_sent',
  decline_reason: null,
  timeline_estimate_min_days: null,
  timeline_estimate_max_days: null,
  start_date: null,
  end_date: null,
  completion_date: null,
  created_at: '2026-07-01',
  updated_at: '2026-07-01',
  paymentInstallments: [],
  quotations: [quotation],
};

beforeEach(() => {
  vi.mocked(useProjectPayments).mockReturnValue({
    data: [],
  } as unknown as ReturnType<typeof useProjectPayments>);
});

function renderTab(overrides: Partial<Project> = {}) {
  vi.mocked(useProject).mockReturnValue({
    data: { ...project, ...overrides },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useProject>);

  return render(
    <MemoryRouter>
      <InvoicesTab projectId="proj-1" />
    </MemoryRouter>,
  );
}

describe('InvoicesTab', () => {
  it('no longer renders the quotation breakdown or accept/reject actions', () => {
    renderTab({ quotations: [{ ...quotation, status: 'accepted' }] });

    // The quotation's cost breakdown moved to the Quotations section. Asserted
    // via 'Breakdown'/'Pages Included' rather than the card title, since the
    // payment receipt added below shares the title "Payment Receipt".
    expect(screen.queryByText('Breakdown')).not.toBeInTheDocument();
    expect(screen.queryByText('Pages Included')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accept Quotation' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Request Changes' })).not.toBeInTheDocument();
  });

  it('never renders the payment receipt itself — that moved to the Invoices section', () => {
    vi.mocked(useProjectPayments).mockReturnValue({
      data: [
        {
          id: 'p-1',
          project_id: 'proj-1',
          installment_id: 'i-1',
          payment_method: 'gcash',
          amount: '25000.00',
          reference_number: 'REF123',
          proof_of_payment_url: null,
          status: 'verified',
          verified_by: 1,
          verified_at: '2026-07-02',
          created_at: '2026-07-01',
        },
      ],
    } as unknown as ReturnType<typeof useProjectPayments>);

    renderTab({ quotations: [{ ...quotation, status: 'accepted' }] });

    expect(screen.queryByText('Payment Receipt')).not.toBeInTheDocument();
    expect(screen.queryByText('REF123')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view payment receipts/i })).toHaveAttribute(
      'href',
      '/client/dashboard/invoices',
    );
  });

  it('links a sent quotation out to the quotations section', () => {
    renderTab();

    expect(screen.getByRole('link', { name: /review your quotation/i })).toHaveAttribute(
      'href',
      '/client/dashboard/quotations/proj-1/q-1',
    );
  });
});
