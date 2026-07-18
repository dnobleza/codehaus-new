-- Adds the 'delivered' project status missing from the authoritative
-- 21-row reconciliation in 016_reconcile_project_statuses.sql (that list
-- goes straight from 'deployed' (180) to 'completed' (190)). Per
-- docs/superpowers/specs/2026-07-18-payment-installment-plan-design.md,
-- 'delivered' is a distinct, manually-triggered state reached only once a
-- project's full payment_installments schedule is paid -- inserted between
-- deployed and completed, not replacing either.
--
-- A pure data change (INSERT), not a schema change -- exactly the kind of
-- correction the project_statuses lookup-table design was meant to make
-- cheap (see 004_create_project_statuses.sql's header).
INSERT INTO project_statuses (code, label, display_order, is_terminal)
VALUES ('delivered', 'Delivered', 185, false);
