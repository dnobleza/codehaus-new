# Payment Installment Plan + Delivered Status — Design

Date: 2026-07-18

## Problem

The current schema (`013_create_payments.sql`) and `payments.service.js` model exactly one lump-sum payment per project: the client submits one payment for the full quotation total, an admin verifies it once, and the project jumps straight to `accepted`. There is no way to collect payment in installments, and `project_statuses` (as reconciled in `016_reconcile_project_statuses.sql`) has no `delivered` state — the sequence goes `deployed` (180) → `completed` (190).

This spec adds a fixed installment payment plan (50% / 20% / 10% / 10% / 10%) collected on a weekly cadence, and a `delivered` project status that is unlocked only once all installments are paid.

## Decisions

- **Split is fixed, not configurable.** Every project uses the same `[50, 20, 10, 10, 10]` percentage sequence. No per-project/per-package override — simplest option that satisfies the requirement, avoids a template/config table nobody asked for.
- **Due dates are a fixed weekly cadence**, anchored to the moment the schedule is generated (quotation acceptance), not `projects.start_date`. `start_date` is never populated anywhere in the current codebase, so anchoring there would silently break; the acceptance timestamp is always available in the same transaction that creates the schedule.
- **Schedule is materialized** as real rows in a new `payment_installments` table (not computed on the fly), so both client and admin can see the full upcoming schedule (amounts + due dates) before any payment is submitted — matches the existing pattern of `quotations`/`payments` being real historical tables rather than derived views.
- **Only the downpayment (installment 1) auto-advances project status**, to `accepted` — identical to today's single-payment behavior. Installments 2–5 verifying does not change `status_code`; the project is already in progress by then.
- **`delivered` is a separate, manual, admin/staff-triggered action**, gated purely on "100% of installments paid" — not on the project's current `status_code`. Delivery readiness is a build/QA judgment call independent of exact status sequencing.

## Data model

### New table: `payment_installments`

```sql
CREATE TABLE payment_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE RESTRICT,
  sequence SMALLINT NOT NULL CHECK (sequence BETWEEN 1 AND 5),
  percentage NUMERIC(5,2) NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  due_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT payment_installments_project_sequence_key UNIQUE (project_id, sequence)
);

CREATE INDEX idx_payment_installments_project_id ON payment_installments(project_id);
CREATE INDEX idx_payment_installments_status ON payment_installments(status);
```

### `payments` table addition

```sql
ALTER TABLE payments
  ADD COLUMN installment_id UUID REFERENCES payment_installments(id) ON DELETE RESTRICT;
```

One verified payment fulfills exactly one installment row (1:1 once paid; an installment can accumulate multiple `rejected` payment attempts before one is accepted, same resubmission pattern as today).

### `project_statuses` addition

Data-only INSERT, same pattern as `016_reconcile_project_statuses.sql`:

```sql
INSERT INTO project_statuses (code, label, display_order, is_terminal)
VALUES ('delivered', 'Delivered', 185, false);
```

Inserted between `deployed` (180) and `completed` (190).

## Schedule generation

Triggered inside `respondToQuotation` (`quotations.service.js`) when `decision === 'accept'`, in the same transaction that sets `projects.status_code = 'quotation_accepted'`.

Percentage split: `[50, 20, 10, 10, 10]`, sequence 1–5.

Amount calculation (avoids floating-point/rounding drift against `quotation.total_amount`):
- Installments 1–4: `round(total_amount * percentage / 100, 2)`
- Installment 5 (last): `total_amount - sum(installments 1..4)` — absorbs any rounding remainder so the 5 rows always sum exactly to `total_amount`.

Due date calculation, anchored to `now()` at generation time:
- `due_date[n] = today + (n - 1) weeks` for n = 1..5 → weeks 0, 1, 2, 3, 4.

### Worked example

₱50,000 quotation accepted 2026-07-18 (Saturday):

| # | % | Amount | Due date |
|---|-----|---------|------------|
| 1 | 50% | ₱25,000 | 2026-07-18 |
| 2 | 20% | ₱10,000 | 2026-07-25 |
| 3 | 10% | ₱5,000 | 2026-08-01 |
| 4 | 10% | ₱5,000 | 2026-08-08 |
| 5 | 10% | ₱5,000 | 2026-08-15 |

## Payment submission flow (`payments.service.js`)

`createPayment` changes:
1. Look up the project's next installment where `status = 'pending'`, ordered by `sequence` ascending (lowest first). If none exists (all paid), reject with 409.
2. Validate the client-submitted `amount` equals that installment's `amount` exactly (reject 409 otherwise). This closes an existing gap too — today's `amount` is fully client-trusted with no check against the quotation total at all.
3. Insert the `payments` row with `installment_id` set to that installment's id, `status = 'verification'` (unchanged from today).
4. **Submission-time project status change is dropped for this feature.** Today, `createPayment` unconditionally sets `projects.status_code = 'payment_verification'`, gated by a source-status allow-list (`CLIENT_PAYMENT_SOURCE_STATUSES = ['quotation_accepted', 'payment_verification']`). That allow-list approach doesn't extend to installments 2–5: by the time those are submitted the project has already moved on to `accepted` (or further, e.g. `in_development`, set manually by admin/staff), and unconditionally overwriting `status_code` to `payment_verification` would clobber real build-progress tracking. New gating: submission is allowed whenever a `pending` installment exists for the project (no `status_code` allow-list at all), and submission never changes `projects.status_code` — only `verifyPayment` does, and only for the downpayment (see below).

`verifyPayment` changes:
1. Set the linked `payment_installments.status = 'paid'`.
2. If the verified installment's `sequence === 1` (the downpayment), advance `projects.status_code` to `'accepted'` — identical to current behavior.
3. If `sequence > 1`, verify the payment but do **not** touch `projects.status_code`.

`rejectPayment`: unchanged. The installment stays `pending`; the client resubmits against the same installment.

## Marking "Delivered"

New admin/staff-only action, e.g. `PATCH /admin/projects/:id/deliver` → `projectsService.markProjectDeliveredAdmin(id)`.

Gate: all 5 `payment_installments` rows for the project must have `status = 'paid'`. If not, reject with 409 (e.g. "Project is not fully paid; N installment(s) remaining"). On success: `projects.status_code = 'delivered'`.

## Out of scope

- Configurable/custom split percentages per project or package.
- Automatic reminders/notifications for upcoming or overdue installments.
- Partial payments against a single installment (an installment is paid in full in one accepted payment, matching today's all-or-nothing payment model).
- Refunds / installment cancellation.
