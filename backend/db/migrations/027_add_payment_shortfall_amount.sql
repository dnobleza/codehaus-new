-- Records the gap between what an installment was due and what the client
-- actually remitted, so a withholding-tax underpayment can be ACCEPTED
-- instead of rejected outright.
--
-- Background: Philippine corporate clients are withholding agents. On a
-- services invoice they remit the creditable withholding tax (EWT) to the BIR
-- directly and pay the supplier the net -- e.g. ₱98,000 against a ₱100,000
-- installment at 2% EWT. Before this column, payments.service.js required an
-- exact amount match and refused the payment, which made the product unusable
-- for the entire B2B segment.
--
-- WHY A COLUMN ON `payments` AND NOT A NEW INSTALLMENT STATUS:
-- The shortfall is not money still owed. It is money the client paid to the
-- BIR on the agency's behalf; the agency claims it back as a tax credit. The
-- installment is therefore fully SETTLED, not partially paid, so
-- payment_installments.status stays the binary 'pending'/'paid' CHECK from
-- 018_create_payment_installments.sql -- deliberately untouched. Introducing a
-- 'partially_paid' state would imply a remaining balance that the schedule
-- would then have to carry forward, which is the invoice/ledger model this
-- pass is explicitly not building.
--
-- The value is stored rather than derived from
-- (payment_installments.amount - payments.amount) so it survives as a
-- first-class fact on the payment: it is readable without a join (the client
-- Invoices list and the admin queue both need it), and it is the amount the
-- accountant reconciles against the client's BIR Form 2307 certificate.
-- Denormalization is justified here because installment amounts are immutable
-- once generated (quotations.service.js writes the schedule once, inside the
-- accept transaction, and nothing updates `amount` afterwards), so the two
-- values can never drift.
--
-- Defaults to 0 and is NOT NULL: every pre-existing payment was, by
-- definition, an exact-amount payment under the old rule, so 0 is the correct
-- historical value and there is no backfill to do. This keeps the 99% exact
-- payment path reading identically to before.
--
-- CHECK (shortfall_amount >= 0) encodes the scope boundary: an overpayment
-- (amount > installment amount) is a different problem with different
-- accounting (refund vs credit note) and is still refused at the service
-- layer. A negative shortfall must never be representable.
--
-- Idempotent (IF NOT EXISTS / DO block guard) in the house style of
-- 016_reconcile_project_statuses.sql, so a partially-applied migration run can
-- safely be repeated.
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS shortfall_amount NUMERIC(12,2) NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payments_shortfall_amount_non_negative'
  ) THEN
    ALTER TABLE payments
      ADD CONSTRAINT payments_shortfall_amount_non_negative CHECK (shortfall_amount >= 0);
  END IF;
END $$;
