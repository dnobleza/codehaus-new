-- Materialized payment schedule generated the moment a client accepts a
-- quotation (see quotations.service.js's generateInstallmentSchedule and
-- docs/superpowers/specs/2026-07-18-payment-installment-plan-design.md).
-- Rows are created upfront -- all 5 at once, all 'pending' -- so both the
-- client and admin/staff can see the full upcoming schedule (amounts + due
-- dates) before any payment is submitted, not just after the fact.
--
-- quotation_id is kept (not just derivable from the project's current
-- quotation) because quotations are historical/versioned per project
-- (009_create_projects.sql) -- a schedule must stay pinned to the exact
-- quotation it was generated from, even if a later quotation revision is
-- created for the same project.
CREATE TABLE payment_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE RESTRICT,
  sequence SMALLINT NOT NULL CHECK (sequence BETWEEN 1 AND 5),
  percentage NUMERIC(5,2) NOT NULL CHECK (percentage > 0),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  due_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT payment_installments_project_sequence_key UNIQUE (project_id, sequence)
);

CREATE INDEX idx_payment_installments_project_id ON payment_installments(project_id);
CREATE INDEX idx_payment_installments_status ON payment_installments(status);
