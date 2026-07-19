import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { PaymentReceiptCard } from './PaymentReceiptCard';
import type { Project } from '@/shared/types/project.types';
import type { Quotation } from '@/shared/types/quotation.types';
import type { Payment } from '@/shared/types/payment.types';

vi.mock('@/modules/packages/api/packages.queries', () => ({
  usePackage: vi.fn(),
}));

import { usePackage } from '@/modules/packages/api/packages.queries';

const baseProject: Project = {
  id: 'proj-1',
  client_id: 1,
  package_id: 'pkg-1',
  title: 'Business Package',
  request_details: null,
  status_code: 'accepted',
  decline_reason: null,
  timeline_estimate_min_days: null,
  timeline_estimate_max_days: null,
  start_date: null,
  end_date: null,
  completion_date: null,
  created_at: '2026-07-01',
  updated_at: '2026-07-01',
  paymentInstallments: [],
};

const baseQuotation: Quotation = {
  id: 'q-1',
  quotation_number: 'QUO-0001',
  project_id: 'proj-1',
  package_id: 'pkg-1',
  base_price: '45000.00',
  estimated_timeline_min_days: 14,
  estimated_timeline_max_days: 21,
  discount_amount: '0.00',
  total_amount: '50000.00',
  status: 'accepted',
  created_at: '2026-07-01',
  sent_at: '2026-07-01',
  responded_at: '2026-07-01',
  addons: [{ addonId: 'a1', name: 'Extra Revision', category: 'design', priceAtTime: 5000 }],
};

const basePayment: Payment = {
  id: 'p-1',
  project_id: 'proj-1',
  payment_method: 'gcash',
  amount: '25000.00',
  reference_number: 'REF123',
  proof_of_payment_url: '/projects/proj-1/payments/p-1/proof',
  status: 'verified',
  verified_by: 1,
  verified_at: '2026-07-02',
  created_at: '2026-07-01',
};

describe('PaymentReceiptCard', () => {
  it('renders nothing when the quotation is not accepted', () => {
    vi.mocked(usePackage).mockReturnValue({ data: undefined } as ReturnType<typeof usePackage>);

    const { container } = render(
      <PaymentReceiptCard
        project={baseProject}
        quotation={{ ...baseQuotation, status: 'sent' }}
        payment={undefined}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders breakdown, pages, schedule, and payment status with no proof image', () => {
    vi.mocked(usePackage).mockReturnValue({
      data: {
        id: 'pkg-1',
        name: 'Business Package',
        slug: 'business',
        description: null,
        base_price: '45000.00',
        estimated_timeline_min_days: 14,
        estimated_timeline_max_days: 21,
        display_order: 0,
        is_active: true,
        thumbnail_url: null,
        banner_url: null,
        is_custom: false,
        created_by: null,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        pages: [
          { id: 'pg1', name: 'Home', displayOrder: 0 },
          { id: 'pg2', name: 'About', displayOrder: 1 },
        ],
        features: [],
      },
    } as ReturnType<typeof usePackage>);

    render(
      <PaymentReceiptCard project={baseProject} quotation={baseQuotation} payment={basePayment} />,
    );

    expect(screen.getByText('Payment Receipt')).toBeInTheDocument();
    expect(screen.getByText('QUO-0001')).toBeInTheDocument();
    expect(screen.getByText('Extra Revision')).toBeInTheDocument();
    expect(screen.getByText('Home, About')).toBeInTheDocument();
    expect(screen.getByText('REF123')).toBeInTheDocument();
    expect(screen.queryByAltText('Uploaded proof of payment')).not.toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /uploaded proof/i })).not.toBeInTheDocument();
  });

  it('hides the pages section for custom projects (no package_id)', () => {
    vi.mocked(usePackage).mockReturnValue({ data: undefined } as ReturnType<typeof usePackage>);

    render(
      <PaymentReceiptCard
        project={{ ...baseProject, package_id: null }}
        quotation={baseQuotation}
        payment={undefined}
      />,
    );

    expect(screen.queryByText('Pages Included')).not.toBeInTheDocument();
  });
});
