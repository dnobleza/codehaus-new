import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { PaymentHistoryReceipt } from './PaymentHistoryReceipt';
import type { PaymentListItem, ProjectInvoice } from '@/shared/types/payment.types';

const verifiedPayment: PaymentListItem = {
  id: 'p-1',
  project_id: 'proj-1',
  payment_method: 'gcash',
  amount: '25000.00',
  reference_number: 'REF123',
  status: 'verified',
  created_at: '2026-07-01',
  verified_at: '2026-07-02',
  installment_sequence: 1,
};

const pendingPayment: PaymentListItem = {
  id: 'p-2',
  project_id: 'proj-1',
  payment_method: 'bank_transfer',
  amount: '10000.00',
  reference_number: null,
  status: 'verification',
  created_at: '2026-07-08',
  verified_at: null,
  installment_sequence: 2,
};

function invoice(overrides: Partial<ProjectInvoice> = {}): ProjectInvoice {
  return {
    project_id: 'proj-1',
    project_title: 'Business Package',
    amount_paid: '25000.00',
    balance_due: '10000.00',
    payments: [verifiedPayment],
    ...overrides,
  };
}

describe('PaymentHistoryReceipt', () => {
  it('renders nothing when the project has no payments', () => {
    const { container } = render(<PaymentHistoryReceipt invoice={invoice({ payments: [] })} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('lists each payment with amount, method, reference, and installment', () => {
    // `getAllBy` throughout: the desktop table and the mobile list are both in
    // the DOM at once, hidden from each other only by responsive CSS.
    render(<PaymentHistoryReceipt invoice={invoice()} />);

    expect(screen.getByText('Payment Receipt')).toBeInTheDocument();
    expect(screen.getByText('Business Package')).toBeInTheDocument();
    expect(screen.getAllByText('Downpayment').length).toBeGreaterThan(0);
    expect(screen.getAllByText('GCash').length).toBeGreaterThan(0);
    expect(screen.getAllByText('REF123').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Verified').length).toBeGreaterThan(0);
  });

  it('shows the server-computed amount paid and balance due', () => {
    render(
      <PaymentHistoryReceipt invoice={invoice({ payments: [pendingPayment, verifiedPayment] })} />,
    );

    expect(screen.getByText(/amount paid/i)).toBeInTheDocument();
    expect(screen.getAllByText('₱25,000').length).toBeGreaterThan(0);
    expect(screen.getByText(/balance due/i)).toBeInTheDocument();
    expect(screen.getAllByText('₱10,000').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/under verification/i).length).toBeGreaterThan(0);
  });

  it('hides the balance row once nothing is outstanding', () => {
    render(<PaymentHistoryReceipt invoice={invoice({ balance_due: '0.00' })} />);

    expect(screen.queryByText(/balance due/i)).not.toBeInTheDocument();
  });

  it('renders a dash for a payment with no reference number', () => {
    render(<PaymentHistoryReceipt invoice={invoice({ payments: [pendingPayment] })} />);

    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('falls back gracefully when a payment predates the installment schedule', () => {
    render(
      <PaymentHistoryReceipt
        invoice={invoice({ payments: [{ ...verifiedPayment, installment_sequence: null }] })}
      />,
    );

    expect(screen.getByText('Payment Receipt')).toBeInTheDocument();
    expect(screen.queryByText('Downpayment')).not.toBeInTheDocument();
  });
});
