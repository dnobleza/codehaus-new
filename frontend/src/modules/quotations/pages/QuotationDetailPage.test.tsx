import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('@/modules/projects/api/projects.queries', () => ({ useProject: vi.fn() }));
vi.mock('@/modules/payments/api/payments.queries', () => ({ useProjectPayments: vi.fn() }));
vi.mock('@/modules/packages/api/packages.queries', () => ({ usePackage: vi.fn() }));
vi.mock('../api/quotations.queries', () => ({
  useAcceptQuotation: vi.fn(),
  useRejectQuotation: vi.fn(),
}));

import { useProject } from '@/modules/projects/api/projects.queries';
import { useProjectPayments } from '@/modules/payments/api/payments.queries';
import { usePackage } from '@/modules/packages/api/packages.queries';
import { useAcceptQuotation, useRejectQuotation } from '../api/quotations.queries';
import { QuotationDetailPage } from './QuotationDetailPage';
import type { Project } from '@/shared/types/project.types';
import type { Quotation, QuotationStatus } from '@/shared/types/quotation.types';

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
  addons: [{ addonId: 'a1', name: 'Extra Revision', category: 'dashboard', priceAtTime: 5000 }],
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

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/client/dashboard/quotations/proj-1/q-1']}>
      <Routes>
        <Route
          path="/client/dashboard/quotations/:projectId/:quotationId"
          element={<QuotationDetailPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

function renderWithStatus(status: QuotationStatus) {
  vi.mocked(useProject).mockReturnValue({
    data: { ...project, quotations: [{ ...quotation, status }] },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useProject>);

  return renderPage();
}

beforeEach(() => {
  vi.mocked(useProjectPayments).mockReturnValue({
    data: [],
  } as unknown as ReturnType<typeof useProjectPayments>);
  vi.mocked(usePackage).mockReturnValue({
    data: undefined,
  } as unknown as ReturnType<typeof usePackage>);
  vi.mocked(useAcceptQuotation).mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
    error: null,
  } as unknown as ReturnType<typeof useAcceptQuotation>);
  vi.mocked(useRejectQuotation).mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
    error: null,
  } as unknown as ReturnType<typeof useRejectQuotation>);
});

describe('QuotationDetailPage', () => {
  it('shows the breakdown, projected schedule, and actions for a sent quotation', () => {
    renderWithStatus('sent');

    expect(screen.getByText('Extra Revision')).toBeInTheDocument();
    expect(screen.getByText('Payment Schedule')).toBeInTheDocument();
    expect(screen.getAllByText('On acceptance').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Accept Quotation' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Request Changes' })).toBeInTheDocument();
  });

  it('shows a prepared-in-progress notice for a draft quotation', () => {
    renderWithStatus('draft');

    expect(screen.getByText(/being prepared/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accept Quotation' })).not.toBeInTheDocument();
  });

  it('shows the receipt for an accepted quotation', () => {
    renderWithStatus('accepted');

    expect(screen.getByText('Payment Receipt')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accept Quotation' })).not.toBeInTheDocument();
  });

  it('shows a changes-requested notice for a rejected quotation', () => {
    renderWithStatus('rejected');

    expect(screen.getByText(/requested changes/i)).toBeInTheDocument();
  });

  it('shows the error state when the quotation is not on the project', () => {
    vi.mocked(useProject).mockReturnValue({
      data: { ...project, quotations: [] },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useProject>);

    renderPage();

    expect(screen.queryByText('QUO-0001')).not.toBeInTheDocument();
  });
});
