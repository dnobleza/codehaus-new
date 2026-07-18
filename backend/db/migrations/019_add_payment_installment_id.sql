-- Links a payment to the specific installment it fulfills (see
-- 018_create_payment_installments.sql). ON DELETE RESTRICT: no code path
-- ever deletes a payment_installments row, so this is a safety net, not an
-- expected trigger.
--
-- Nullable because it's populated by the application layer
-- (payments.service.js resolves the next pending installment and passes
-- its id through) -- there's no installment to default to at the DB level.
ALTER TABLE payments
  ADD COLUMN installment_id UUID REFERENCES payment_installments(id) ON DELETE RESTRICT;

CREATE INDEX idx_payments_installment_id ON payments(installment_id);
