import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../api/quotations.queries', () => ({
  useMyQuotations: vi.fn(),
}));

import { useMyQuotations } from '../api/quotations.queries';
import { QuotationsListPage } from './QuotationsListPage';
import type { QuotationListItem } from '@/shared/types/quotation.types';

const rows: QuotationListItem[] = [
  {
    id: 'q-1',
    quotation_number: 'QUO-0001',
    status: 'sent',
    total_amount: '50000.00',
    created_at: '2026-07-01',
    project_id: 'proj-1',
    project_title: 'Business Package',
  },
];

function mockQuery(value: unknown) {
  vi.mocked(useMyQuotations).mockReturnValue(value as ReturnType<typeof useMyQuotations>);
}

describe('QuotationsListPage', () => {
  it('lists each quotation with its project, status, and total', () => {
    mockQuery({ data: rows, isLoading: false, isError: false, refetch: vi.fn() });

    render(
      <MemoryRouter>
        <QuotationsListPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('QUO-0001')).toBeInTheDocument();
    expect(screen.getByText('Business Package')).toBeInTheDocument();
    expect(screen.getByText('Awaiting your response')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'QUO-0001' })).toHaveAttribute(
      'href',
      '/client/dashboard/quotations/proj-1/q-1',
    );
  });

  it('shows an empty message when the client has no quotations', () => {
    mockQuery({ data: [], isLoading: false, isError: false, refetch: vi.fn() });

    render(
      <MemoryRouter>
        <QuotationsListPage />
      </MemoryRouter>,
    );

    expect(screen.getByText(/haven't received any quotations/i)).toBeInTheDocument();
  });

  it('shows the error state when the request fails', () => {
    mockQuery({ data: undefined, isLoading: false, isError: true, refetch: vi.fn() });

    render(
      <MemoryRouter>
        <QuotationsListPage />
      </MemoryRouter>,
    );

    expect(screen.queryByText('QUO-0001')).not.toBeInTheDocument();
  });
});
