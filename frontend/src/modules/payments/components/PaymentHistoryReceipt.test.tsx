import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { PaymentHistoryReceipt } from './PaymentHistoryReceipt';
import type { Payment, PaymentInstallment } from '@/shared/types/payment.types';

const installments: PaymentInstallment[] = [
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
    due_date: '2026-07-08',
    status: 'pending',
    created_at: '2026-07-01',
  },
];

const verifiedPayment: Payment = {
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
};

const pendingPayment: Payment = {
  id: 'p-2',
  project_id: 'proj-1',
  installment_id: 'i-2',
  payment_method: 'bank_transfer',
  amount: '10000.00',
  reference_number: null,
  proof_of_payment_url: null,
  status: 'verification',
  verified_by: null,
  verified_at: null,
  created_at: '2026-07-08',
};

describe('PaymentHistoryReceipt', () => {
  it('renders nothing when no payments have been submitted', () => {
    const { container } = render(
      <PaymentHistoryReceipt payments={[]} installments={installments} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('lists each payment with amount, method, reference, and installment', () => {
    render(<PaymentHistoryReceipt payments={[verifiedPayment]} installments={installments} />);

    expect(screen.getByText('Payment Receipt')).toBeInTheDocument();
    expect(screen.getAllByText('Downpayment').length).toBeGreaterThan(0);
    expect(screen.getAllByText('GCash').length).toBeGreaterThan(0);
    expect(screen.getAllByText('REF123').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Verified').length).toBeGreaterThan(0);
  });

  it('counts only verified payments toward the amount paid', () => {
    render(
      <PaymentHistoryReceipt
        payments={[pendingPayment, verifiedPayment]}
        installments={installments}
      />,
    );

    // ₱25,000 verified; the ₱10,000 still under verification must NOT count.
    // `getAllBy` throughout: the desktop table and the mobile list are both in
    // the DOM at once, hidden from each other only by responsive CSS.
    expect(screen.getAllByText('₱25,000').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/under verification/i).length).toBeGreaterThan(0);
  });

  it('shows the outstanding balance from still-pending installments', () => {
    render(<PaymentHistoryReceipt payments={[verifiedPayment]} installments={installments} />);

    expect(screen.getByText(/balance due/i)).toBeInTheDocument();
    expect(screen.getAllByText('₱10,000').length).toBeGreaterThan(0);
  });

  it('renders a dash for a payment with no reference number', () => {
    render(<PaymentHistoryReceipt payments={[pendingPayment]} installments={installments} />);

    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('falls back gracefully when a payment has no linked installment', () => {
    render(
      <PaymentHistoryReceipt
        payments={[{ ...verifiedPayment, installment_id: null }]}
        installments={installments}
      />,
    );

    expect(screen.getByText('Payment Receipt')).toBeInTheDocument();
    expect(screen.queryByText('Downpayment')).not.toBeInTheDocument();
  });
});
