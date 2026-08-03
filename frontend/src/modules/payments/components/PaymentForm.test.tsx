import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

vi.mock('../api/payments.queries', async () => ({
  useSubmitPayment: vi.fn(() => ({ mutate: vi.fn(), isPending: false, error: null })),
}));

import { PaymentForm } from './PaymentForm';
import { PAYMENT_ACCOUNTS } from '../paymentAccounts';
import type { PaymentInstallment } from '@/shared/types/payment.types';

// `fireEvent` rather than `@testing-library/user-event`, which this project
// doesn't depend on (NotificationBell.test.tsx sets the same precedent).
const installment: PaymentInstallment = {
  id: 'i-1',
  project_id: 'proj-1',
  quotation_id: 'q-1',
  sequence: 1,
  percentage: '50.00',
  amount: '100000.00',
  due_date: '2026-07-01',
  status: 'pending',
  created_at: '2026-07-01',
};

function renderForm() {
  return render(<PaymentForm projectId="proj-1" installment={installment} />);
}

function amountField() {
  return screen.getByLabelText(/amount to pay/i);
}

function setAmount(value: string) {
  fireEvent.change(amountField(), { target: { value } });
}

describe('PaymentForm — where to send the money', () => {
  it('shows no account details until a method is chosen', () => {
    renderForm();

    expect(screen.queryByText(PAYMENT_ACCOUNTS.bank_transfer.title)).not.toBeInTheDocument();
    expect(screen.queryByText(PAYMENT_ACCOUNTS.gcash.title)).not.toBeInTheDocument();
  });

  it('reveals the bank account details when bank transfer is selected', () => {
    renderForm();

    fireEvent.click(screen.getByRole('radio', { name: /bank transfer/i }));

    expect(screen.getByText(PAYMENT_ACCOUNTS.bank_transfer.title)).toBeInTheDocument();
    for (const field of PAYMENT_ACCOUNTS.bank_transfer.fields) {
      expect(screen.getByText(field.label)).toBeInTheDocument();
      expect(screen.getByText(field.value)).toBeInTheDocument();
    }
  });

  it('swaps to the GCash details when the method changes', () => {
    renderForm();

    fireEvent.click(screen.getByRole('radio', { name: /bank transfer/i }));
    fireEvent.click(screen.getByRole('radio', { name: /gcash/i }));

    expect(screen.getByText(PAYMENT_ACCOUNTS.gcash.title)).toBeInTheDocument();
    expect(screen.queryByText(PAYMENT_ACCOUNTS.bank_transfer.title)).not.toBeInTheDocument();
  });
});

describe('PaymentForm — withholding-tax amounts', () => {
  it('pre-fills the full installment amount and no longer locks the field', () => {
    renderForm();

    expect((amountField() as HTMLInputElement).value).toBe('100000');
    expect(amountField()).not.toHaveAttribute('readonly');
  });

  it('surfaces the shortfall as the client enters a net-of-tax amount', () => {
    renderForm();

    setAmount('98000');

    expect(screen.getByText(/₱2,000 less/)).toBeInTheDocument();
  });

  it('rejects an amount above the installment total on submit', async () => {
    renderForm();

    setAmount('120000');
    fireEvent.submit(screen.getByRole('button', { name: /submit payment/i }));

    expect(await screen.findByText(/can't be more than/i)).toBeInTheDocument();
  });

  it('rejects an amount short by more than the withholding tolerance', async () => {
    renderForm();

    setAmount('50000');
    fireEvent.submit(screen.getByRole('button', { name: /submit payment/i }));

    expect(await screen.findByText(/more than 10% below/i)).toBeInTheDocument();
  });
});
