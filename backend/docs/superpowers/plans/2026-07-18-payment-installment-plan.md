# Payment Installment Plan + Delivered Status Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current single-lump-sum payment model with a fixed 50/20/10/10/10 installment schedule (weekly cadence), and add a `delivered` project status that's only reachable once every installment is paid.

**Architecture:** A new `payment_installments` table is materialized (5 rows) inside the existing `respondToQuotation` transaction the moment a client accepts a quotation. `payments.installment_id` links each submitted payment to the installment it fulfills. Submitting/verifying a payment is re-pointed at "the next pending installment for this project" instead of a free-form client-supplied amount. Only verifying installment #1 (the downpayment) still auto-advances `projects.status_code` to `accepted`, matching current behavior; a new admin-only action marks a project `delivered` once zero installments remain pending.

**Tech Stack:** Node.js (CommonJS) + Express 5, `pg` (raw parameterized SQL, no ORM despite Prisma being a listed dependency — this codebase's repository layer uses `pg` directly), Zod validators, Jest is NOT installed (see Global Constraints).

## Global Constraints

- Fixed installment split for every project: `[50, 20, 10, 10, 10]` percent, sequence 1-5. Not configurable. (Spec §Decisions)
- Amount rounding: installments 1-4 = `round(total * pct / 100, 2)`; installment 5 = `total - sum(1..4)`, so the 5 rows always sum to exactly `quotation.total_amount`. (Spec §Schedule generation)
- Due dates: fixed weekly cadence, `due_date[n] = generatedAt + (n-1) weeks`, anchored to the moment the schedule is generated (quotation acceptance) — never `projects.start_date` (that column is never populated anywhere in this codebase). (Spec §Decisions)
- Only verifying installment `sequence = 1` advances `projects.status_code` (to `'accepted'`). Installments 2-5 verifying, and ALL installment submission (`createPayment`), never touch `projects.status_code`. (Spec §Payment submission flow)
- `delivered` project status is gated purely on "0 pending installments remain" — not on the project's current `status_code`. (Spec §Marking Delivered)
- **No automated test framework exists in this repo** (no Jest/Mocha in `backend/package.json`, no `test` script, zero `*.test.js` files under `backend/src`). Every "verify" step in this plan therefore runs against the real local dev Postgres DB (already reachable — confirmed via `backend/.env`, migrations `001`-`017` already applied) using one-off `node -e` scripts that `require()` the actual repository/service modules, mirroring how `npm run migrate` itself is the codebase's only existing verification mechanism. Each verification script cleans up any rows it creates (deleting a throwaway `projects` row cascades to its `quotations`/`payment_installments` rows).
- Migration numbering continues sequentially from the last applied migration: `018`, `019`, `020`.

---

## File Structure

- Create `backend/db/migrations/018_create_payment_installments.sql` — new table.
- Create `backend/db/migrations/019_add_payment_installment_id.sql` — links `payments` to the installment it fulfills.
- Create `backend/db/migrations/020_add_delivered_project_status.sql` — data-only INSERT into `project_statuses`.
- Create `backend/src/repositories/paymentInstallments.repository.js` — raw queries for the new table.
- Modify `backend/src/repositories/payments.repository.js` — `insert()` gains `installment_id`.
- Modify `backend/src/services/quotations.service.js` — generate the 5-row schedule inside `respondToQuotation` on accept.
- Modify `backend/src/services/payments.service.js` — `createPayment`/`verifyPayment` rewired around installments.
- Modify `backend/src/services/projects.service.js` — new `markProjectDeliveredAdmin`; nest `paymentInstallments` into the two project-detail reads.
- Modify `backend/src/controllers/adminProjects.controller.js` — new `deliver` action.
- Modify `backend/src/routes/adminProjects.route.js` — new `PATCH /:id/deliver` route.

---

### Task 1: Data layer — schema + `paymentInstallments` repository

**Files:**
- Create: `backend/db/migrations/018_create_payment_installments.sql`
- Create: `backend/db/migrations/019_add_payment_installment_id.sql`
- Create: `backend/db/migrations/020_add_delivered_project_status.sql`
- Create: `backend/src/repositories/paymentInstallments.repository.js`
- Modify: `backend/src/repositories/payments.repository.js:6-21` (the `insert` function)

**Interfaces:**
- Produces (used by Task 2, 3, 4): `paymentInstallmentsRepo.insert({ projectId, quotationId, sequence, percentage, amount, dueDate }, db) -> Promise<row>`, `paymentInstallmentsRepo.listByProject(projectId, db) -> Promise<row[]>` (ordered by `sequence`), `paymentInstallmentsRepo.findNextPending(projectId, db) -> Promise<row|null>` (row-locked via `FOR UPDATE`, must be called inside a transaction), `paymentInstallmentsRepo.setPaid(id, db) -> Promise<row|null>`, `paymentInstallmentsRepo.countPending(projectId, db) -> Promise<number>`, `paymentInstallmentsRepo.countForProject(projectId, db) -> Promise<number>`. Every function's `db` param defaults to the shared `pool`, matching every other repository in this codebase.
- Produces: `paymentsRepo.insert(data, db)` now also accepts `data.installmentId` (nullable).

- [ ] **Step 1: Write migration 018 (create table)**

```sql
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
```

- [ ] **Step 2: Write migration 019 (link `payments` to an installment)**

```sql
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
```

- [ ] **Step 3: Write migration 020 (add the `delivered` status)**

```sql
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
```

- [ ] **Step 4: Run the migrations**

Run (from `backend/`): `npm run migrate`

Expected: log lines `Applying 018_create_payment_installments.sql`, `Applying 019_add_payment_installment_id.sql`, `Applying 020_add_delivered_project_status.sql`, then `Up to date`. No errors.

- [ ] **Step 5: Verify schema against the real dev DB**

Run (from `backend/`):
```bash
node -e "
require('dotenv').config();
const pool = require('./src/config/database');
(async () => {
  const cols = await pool.query(\"SELECT column_name FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'installment_id'\");
  console.log('installment_id column:', cols.rows.length === 1 ? 'OK' : 'MISSING');
  const status = await pool.query(\"SELECT code, label, display_order FROM project_statuses WHERE code = 'delivered'\");
  console.log('delivered status row:', JSON.stringify(status.rows[0] || 'MISSING'));
  process.exit(0);
})();
"
```

Expected output:
```
installment_id column: OK
delivered status row: {"code":"delivered","label":"Delivered","display_order":185}
```

- [ ] **Step 6: Write `backend/src/repositories/paymentInstallments.repository.js`**

```js
const pool = require('../config/database');

// Raw, parameterized `pg` queries only -- no business logic (see
// services/quotations.service.js for schedule generation and
// services/payments.service.js for fulfillment/verification rules).

async function insert(data, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO payment_installments (project_id, quotation_id, sequence, percentage, amount, due_date)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [data.projectId, data.quotationId, data.sequence, data.percentage, data.amount, data.dueDate]
  );
  return rows[0];
}

async function listByProject(projectId, db = pool) {
  const { rows } = await db.query(
    'SELECT * FROM payment_installments WHERE project_id = $1 ORDER BY sequence ASC',
    [projectId]
  );
  return rows;
}

// Row-locked so two concurrent payment submissions for the same project
// can never both claim the same installment as "next" -- must be called
// inside an existing BEGIN/COMMIT transaction (see payments.service.js).
async function findNextPending(projectId, db = pool) {
  const { rows } = await db.query(
    `SELECT * FROM payment_installments
     WHERE project_id = $1 AND status = 'pending'
     ORDER BY sequence ASC
     LIMIT 1
     FOR UPDATE`,
    [projectId]
  );
  return rows[0] || null;
}

async function setPaid(id, db = pool) {
  const { rows } = await db.query(`UPDATE payment_installments SET status = 'paid' WHERE id = $1 RETURNING *`, [id]);
  return rows[0] || null;
}

async function countPending(projectId, db = pool) {
  const { rows } = await db.query(
    `SELECT COUNT(*)::int AS count FROM payment_installments WHERE project_id = $1 AND status = 'pending'`,
    [projectId]
  );
  return rows[0].count;
}

async function countForProject(projectId, db = pool) {
  const { rows } = await db.query(`SELECT COUNT(*)::int AS count FROM payment_installments WHERE project_id = $1`, [
    projectId,
  ]);
  return rows[0].count;
}

module.exports = { insert, listByProject, findNextPending, setPaid, countPending, countForProject };
```

- [ ] **Step 7: Extend `backend/src/repositories/payments.repository.js`'s `insert`**

Replace lines 6-21:
```js
async function insert(data, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO payments (project_id, payment_method, amount, reference_number, proof_of_payment_url, status)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [
      data.projectId,
      data.paymentMethod,
      data.amount,
      data.referenceNumber ?? null,
      data.proofOfPaymentUrl ?? null,
      data.status ?? 'pending',
    ]
  );
  return rows[0];
}
```

with:
```js
async function insert(data, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO payments (project_id, payment_method, amount, reference_number, proof_of_payment_url, status, installment_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [
      data.projectId,
      data.paymentMethod,
      data.amount,
      data.referenceNumber ?? null,
      data.proofOfPaymentUrl ?? null,
      data.status ?? 'pending',
      data.installmentId ?? null,
    ]
  );
  return rows[0];
}
```

- [ ] **Step 8: Verify the repository against the real dev DB**

Run (from `backend/`):
```bash
node -e "
require('dotenv').config();
const pool = require('./src/config/database');
const projectsRepo = require('./src/repositories/projects.repository');
const quotationsRepo = require('./src/repositories/quotations.repository');
const installmentsRepo = require('./src/repositories/paymentInstallments.repository');

(async () => {
  const { rows: [clientUser] } = await pool.query(\"SELECT user_id FROM users WHERE role = 'CLIENT' LIMIT 1\");
  const project = await projectsRepo.create({ clientId: clientUser.user_id, packageId: null, title: 'Task1 verify', requestDetails: null });
  const quotation = await quotationsRepo.insert({ projectId: project.id, packageId: null, basePrice: 1000, totalAmount: 1000, status: 'sent' });

  const row = await installmentsRepo.insert({ projectId: project.id, quotationId: quotation.id, sequence: 1, percentage: 50, amount: 500, dueDate: new Date() });
  console.log('insert:', row.status === 'pending' && Number(row.amount) === 500 ? 'OK' : 'FAIL');

  const next = await installmentsRepo.findNextPending(project.id);
  console.log('findNextPending:', next && next.id === row.id ? 'OK' : 'FAIL');

  console.log('countPending before paid:', await installmentsRepo.countPending(project.id));
  await installmentsRepo.setPaid(row.id);
  console.log('countPending after paid:', await installmentsRepo.countPending(project.id));
  console.log('countForProject:', await installmentsRepo.countForProject(project.id));

  await pool.query('DELETE FROM projects WHERE id = \$1', [project.id]);
  console.log('cleanup: done');
  process.exit(0);
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
"
```

Expected output:
```
insert: OK
findNextPending: OK
countPending before paid: 1
countPending after paid: 0
countForProject: 1
cleanup: done
```

- [ ] **Step 9: Commit**

```bash
git add backend/db/migrations/018_create_payment_installments.sql backend/db/migrations/019_add_payment_installment_id.sql backend/db/migrations/020_add_delivered_project_status.sql backend/src/repositories/paymentInstallments.repository.js backend/src/repositories/payments.repository.js
git commit -m "feat: add payment_installments schema and repository"
```

---

### Task 2: Schedule generation on quotation acceptance

**Files:**
- Modify: `backend/src/services/quotations.service.js`

**Interfaces:**
- Consumes: `paymentInstallmentsRepo.insert` from Task 1.
- Produces (used by Task 3, 4): a `payment_installments` row set (5 rows, sequence 1-5) exists for `project_id` immediately after `respondToQuotation({ decision: 'accept' })` resolves, in the same transaction.

- [ ] **Step 1: Add the `paymentInstallmentsRepo` require**

In `backend/src/services/quotations.service.js`, after line 5 (`const addonsRepo = require('../repositories/addons.repository');`), add:
```js
const paymentInstallmentsRepo = require('../repositories/paymentInstallments.repository');
```

- [ ] **Step 2: Add the schedule-generation helper**

Insert this function after `computeTotal` (after line 60, before `persistQuotation`):
```js
const INSTALLMENT_PERCENTAGES = [50, 20, 10, 10, 10];
const INSTALLMENT_WEEK_SPACING_DAYS = 7;

// Generates the fixed 50/20/10/10/10 payment schedule the moment a client
// accepts a quotation (see
// docs/superpowers/specs/2026-07-18-payment-installment-plan-design.md).
// Installments 1-4 are rounded to the cent from the percentage; installment
// 5 absorbs whatever rounding remainder is left, so the 5 rows always sum
// to EXACTLY totalAmount, never a cent over/under from float rounding. Due
// dates are a fixed weekly cadence anchored to "now" (schedule-generation
// time) -- not projects.start_date, which is never populated anywhere in
// this codebase.
async function generateInstallmentSchedule(dbClient, { projectId, quotationId, totalAmount }) {
  const total = toMoney(totalAmount);
  const amounts = INSTALLMENT_PERCENTAGES.slice(0, -1).map((pct) => toMoney((total * pct) / 100));
  const amountSoFar = amounts.reduce((sum, amount) => sum + amount, 0);
  amounts.push(toMoney(total - amountSoFar));

  const generatedAt = new Date();

  for (let index = 0; index < INSTALLMENT_PERCENTAGES.length; index += 1) {
    const sequence = index + 1;
    const dueDate = new Date(generatedAt);
    dueDate.setDate(dueDate.getDate() + (sequence - 1) * INSTALLMENT_WEEK_SPACING_DAYS);

    await paymentInstallmentsRepo.insert(
      {
        projectId,
        quotationId,
        sequence,
        percentage: INSTALLMENT_PERCENTAGES[index],
        amount: amounts[index],
        dueDate,
      },
      dbClient
    );
  }
}
```

- [ ] **Step 3: Call it from `respondToQuotation` on accept**

In `respondToQuotation` (current lines 279-319), after the `await projectsRepo.updateStatus(projectId, newProjectStatus, client);` line and before `await client.query('COMMIT');`, add:
```js
    if (decision === 'accept') {
      await generateInstallmentSchedule(client, {
        projectId,
        quotationId,
        totalAmount: quotation.total_amount,
      });
    }
```

- [ ] **Step 4: Verify against the real dev DB**

`project_packages` row `11111111-1111-1111-1111-111111111101` ("Starter Website", `base_price = 25000.00`) already exists in the dev DB, giving predictable numbers: 25000 × [50,20,10,10,10]% = [12500, 5000, 2500, 2500, 2500].

Run (from `backend/`):
```bash
node -e "
require('dotenv').config();
const pool = require('./src/config/database');
const projectsRepo = require('./src/repositories/projects.repository');
const quotationsRepo = require('./src/repositories/quotations.repository');
const quotationsService = require('./src/services/quotations.service');

(async () => {
  const { rows: [clientUser] } = await pool.query(\"SELECT user_id FROM users WHERE role = 'CLIENT' LIMIT 1\");
  const project = await projectsRepo.create({ clientId: clientUser.user_id, packageId: '11111111-1111-1111-1111-111111111101', title: 'Task2 verify', requestDetails: null });
  const quotation = await quotationsRepo.insert({
    projectId: project.id,
    packageId: '11111111-1111-1111-1111-111111111101',
    basePrice: 25000,
    totalAmount: 25000,
    status: 'sent',
    sentAt: new Date(),
  });

  await quotationsService.respondToQuotation({ projectId: project.id, quotationId: quotation.id, clientId: clientUser.user_id, decision: 'accept' });

  const { rows } = await pool.query('SELECT sequence, percentage, amount, due_date FROM payment_installments WHERE project_id = \$1 ORDER BY sequence', [project.id]);
  console.log(rows.map(r => \`#\${r.sequence} \${r.percentage}% ₱\${r.amount} due \${r.due_date.toISOString().slice(0,10)}\`).join('\n'));
  console.log('sum:', rows.reduce((s, r) => s + Number(r.amount), 0));

  await pool.query('DELETE FROM projects WHERE id = \$1', [project.id]);
  process.exit(0);
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
"
```

Expected output (dates will be today + N×7 days from whenever you run this):
```
#1 50.00% ₱12500.00 due <today>
#2 20.00% ₱5000.00 due <today+7d>
#3 10.00% ₱2500.00 due <today+14d>
#4 10.00% ₱2500.00 due <today+21d>
#5 10.00% ₱2500.00 due <today+28d>
sum: 25000
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/quotations.service.js
git commit -m "feat: generate installment payment schedule on quotation acceptance"
```

---

### Task 3: Rewire payment submission/verification around installments

**Files:**
- Modify: `backend/src/services/payments.service.js`

**Interfaces:**
- Consumes: `paymentInstallmentsRepo.findNextPending`, `.setPaid` from Task 1; the `payment_installments` rows produced by Task 2.
- Produces (used by Task 4): verifying the `sequence = 1` installment sets `projects.status_code = 'accepted'`; verifying any other installment leaves `projects.status_code` untouched.

- [ ] **Step 1: Replace the top of the file**

Replace lines 1-19:
```js
const pool = require('../config/database');
const paymentsRepo = require('../repositories/payments.repository');
const projectsRepo = require('../repositories/projects.repository');
const { resolvePaymentProofPath } = require('../middleware/upload.middleware');
const logger = require('../utils/logger');
const TAG = '[PAYMENTS-SERVICE]';

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

// A client may submit a payment once their quotation has been accepted, OR
// resubmit after a previous attempt was rejected -- rejecting a payment
// deliberately leaves the project's status_code at 'payment_verification'
// (see rejectPayment below), so that status is also a valid source state
// for a fresh submission.
const CLIENT_PAYMENT_SOURCE_STATUSES = ['quotation_accepted', 'payment_verification'];
```

with:
```js
const pool = require('../config/database');
const paymentsRepo = require('../repositories/payments.repository');
const projectsRepo = require('../repositories/projects.repository');
const paymentInstallmentsRepo = require('../repositories/paymentInstallments.repository');
const { resolvePaymentProofPath } = require('../middleware/upload.middleware');
const logger = require('../utils/logger');
const TAG = '[PAYMENTS-SERVICE]';

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}
```

- [ ] **Step 2: Rewrite `createPayment`**

Replace the whole function (current lines 21-61, from the `// Combines Client Workflow steps 9...` comment through the closing `}`):
```js
// A client submits a payment against whichever installment is next in
// their project's payment_installments schedule (see
// docs/superpowers/specs/2026-07-18-payment-installment-plan-design.md) --
// the client never chooses/names an installment; the server resolves it.
// The submitted amount must match that installment's amount exactly (never
// trust a client-supplied amount against the schedule). Combines Client
// Workflow steps 9 ("select payment method") and 10 ("upload proof of
// payment") into a single write, same as before -- the payment is created
// directly in 'verification' status (proof already attached).
async function createPayment({ projectId, clientId, paymentMethod, amount, referenceNumber, proofOfPaymentUrl }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: projectRows } = await client.query(
      'SELECT * FROM projects WHERE id = $1 AND client_id = $2 FOR UPDATE',
      [projectId, clientId]
    );
    const project = projectRows[0];
    if (!project) throw httpError(404, 'Project not found');

    const installment = await paymentInstallmentsRepo.findNextPending(projectId, client);
    if (!installment) {
      throw httpError(409, 'This project is not currently awaiting a payment submission');
    }
    if (Number(amount) !== Number(installment.amount)) {
      throw httpError(
        409,
        `Amount must match installment ${installment.sequence}'s due amount of ${installment.amount}`
      );
    }

    const payment = await paymentsRepo.insert(
      {
        projectId,
        paymentMethod,
        amount,
        referenceNumber,
        proofOfPaymentUrl,
        status: 'verification',
        installmentId: installment.id,
      },
      client
    );

    await client.query('COMMIT');
    logger.info(
      `${TAG} Client ${clientId} submitted payment ${payment.id} for project ${projectId} (installment ${installment.sequence})`
    );
    return payment;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

- [ ] **Step 3: Rewrite `verifyPayment`**

Replace the whole function (the `// Verifying a payment transitions...` comment through its closing `}`, currently lines 73-102):
```js
// Verifying a payment marks its linked installment 'paid'. Only verifying
// the DOWNPAYMENT (sequence 1) also transitions the parent project to
// 'accepted' in the SAME transaction (Client Workflow steps 11 -> 12),
// matching the original single-payment behavior. Installments 2-5 verify
// without touching projects.status_code -- the project is already in
// progress by then, and unconditionally overwriting status_code would
// clobber real build-progress tracking (e.g. 'in_development').
async function verifyPayment(paymentId, verifiedByUserId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: paymentRows } = await client.query('SELECT * FROM payments WHERE id = $1 FOR UPDATE', [paymentId]);
    const payment = paymentRows[0];
    if (!payment) throw httpError(404, 'Payment not found');
    if (payment.status === 'verified') throw httpError(409, 'Payment has already been verified');

    const updated = await paymentsRepo.setStatus(
      paymentId,
      { status: 'verified', verifiedBy: verifiedByUserId, verifiedAt: new Date() },
      client
    );

    const installment = await paymentInstallmentsRepo.setPaid(payment.installment_id, client);

    if (installment.sequence === 1) {
      await projectsRepo.updateStatus(payment.project_id, 'accepted', client);
    }

    await client.query('COMMIT');
    logger.info(
      `${TAG} Payment ${paymentId} verified by user ${verifiedByUserId}; installment ${installment.sequence} marked paid`
    );
    return updated;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

`rejectPayment` and `resolveProofForAccess` are unchanged — leave them exactly as they are.

- [ ] **Step 4: Verify against the real dev DB**

Run (from `backend/`):
```bash
node -e "
require('dotenv').config();
const pool = require('./src/config/database');
const projectsRepo = require('./src/repositories/projects.repository');
const quotationsRepo = require('./src/repositories/quotations.repository');
const quotationsService = require('./src/services/quotations.service');
const paymentsService = require('./src/services/payments.service');

(async () => {
  const { rows: [clientUser] } = await pool.query(\"SELECT user_id FROM users WHERE role = 'CLIENT' LIMIT 1\");
  const { rows: [adminUser] } = await pool.query(\"SELECT user_id FROM users WHERE role = 'ADMIN' LIMIT 1\");
  const project = await projectsRepo.create({ clientId: clientUser.user_id, packageId: '11111111-1111-1111-1111-111111111101', title: 'Task3 verify', requestDetails: null });
  const quotation = await quotationsRepo.insert({ projectId: project.id, packageId: '11111111-1111-1111-1111-111111111101', basePrice: 25000, totalAmount: 25000, status: 'sent', sentAt: new Date() });
  await quotationsService.respondToQuotation({ projectId: project.id, quotationId: quotation.id, clientId: clientUser.user_id, decision: 'accept' });

  // Wrong amount is rejected
  try {
    await paymentsService.createPayment({ projectId: project.id, clientId: clientUser.user_id, paymentMethod: 'gcash', amount: 999, referenceNumber: 'X', proofOfPaymentUrl: 'uploads/x.png' });
    console.log('wrong amount rejected: FAIL (did not throw)');
  } catch (e) {
    console.log('wrong amount rejected:', e.statusCode === 409 ? 'OK' : 'FAIL');
  }

  // Correct downpayment amount (12500) submits and does NOT change project status
  const p1 = await paymentsService.createPayment({ projectId: project.id, clientId: clientUser.user_id, paymentMethod: 'gcash', amount: 12500, referenceNumber: 'R1', proofOfPaymentUrl: 'uploads/1.png' });
  let projectRow = await projectsRepo.findById(project.id);
  console.log('status unchanged after submit:', projectRow.status_code === 'quotation_accepted' ? 'OK' : \`FAIL (\${projectRow.status_code})\`);

  // Verifying installment 1 advances project to 'accepted'
  await paymentsService.verifyPayment(p1.id, adminUser.user_id);
  projectRow = await projectsRepo.findById(project.id);
  console.log('status after verifying #1:', projectRow.status_code === 'accepted' ? 'OK' : \`FAIL (\${projectRow.status_code})\`);

  // Installment 2 (5000): submit + verify, project status must NOT change again
  const p2 = await paymentsService.createPayment({ projectId: project.id, clientId: clientUser.user_id, paymentMethod: 'gcash', amount: 5000, referenceNumber: 'R2', proofOfPaymentUrl: 'uploads/2.png' });
  await paymentsService.verifyPayment(p2.id, adminUser.user_id);
  projectRow = await projectsRepo.findById(project.id);
  console.log('status unchanged after verifying #2:', projectRow.status_code === 'accepted' ? 'OK' : \`FAIL (\${projectRow.status_code})\`);

  await pool.query('DELETE FROM projects WHERE id = \$1', [project.id]);
  process.exit(0);
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
"
```

Expected output:
```
wrong amount rejected: OK
status unchanged after submit: OK
status after verifying #1: OK
status unchanged after verifying #2: OK
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/payments.service.js
git commit -m "feat: rewire payment submission/verification around installment schedule"
```

---

### Task 4: "Mark Delivered" + expose the schedule on project reads

**Files:**
- Modify: `backend/src/services/projects.service.js`

**Interfaces:**
- Consumes: `paymentInstallmentsRepo.countPending`, `.countForProject`, `.listByProject` from Task 1.
- Produces (used by Task 5): `projectsService.markProjectDeliveredAdmin(id) -> Promise<project>` — throws `httpError(409, ...)` if no schedule exists yet or installments remain pending; otherwise sets `status_code = 'delivered'`.

- [ ] **Step 1: Add the `paymentInstallmentsRepo` require**

In `backend/src/services/projects.service.js`, after line 4 (`const projectStatusesRepo = require('../repositories/projectStatuses.repository');`), add:
```js
const paymentInstallmentsRepo = require('../repositories/paymentInstallments.repository');
```

- [ ] **Step 2: Nest the schedule into both project-detail reads**

Replace `getProjectForClient` (current lines 34-39; the doc comment on lines 31-33 above it stays untouched):
```js
async function getProjectForClient(id, clientId) {
  const project = await projectsRepo.findByIdForClient(id, clientId);
  if (!project) throw httpError(404, 'Project not found');
  const quotations = await quotationsRepo.listByProjectWithAddons(id);
  return { ...project, quotations };
}
```

with:
```js
async function getProjectForClient(id, clientId) {
  const project = await projectsRepo.findByIdForClient(id, clientId);
  if (!project) throw httpError(404, 'Project not found');
  const quotations = await quotationsRepo.listByProjectWithAddons(id);
  const paymentInstallments = await paymentInstallmentsRepo.listByProject(id);
  return { ...project, quotations, paymentInstallments };
}
```

Replace `getProjectAdmin` (current lines 45-50):
```js
async function getProjectAdmin(id) {
  const project = await projectsRepo.findById(id);
  if (!project) throw httpError(404, 'Project not found');
  const quotations = await quotationsRepo.listByProjectWithAddons(id);
  return { ...project, quotations };
}
```

with:
```js
async function getProjectAdmin(id) {
  const project = await projectsRepo.findById(id);
  if (!project) throw httpError(404, 'Project not found');
  const quotations = await quotationsRepo.listByProjectWithAddons(id);
  const paymentInstallments = await paymentInstallmentsRepo.listByProject(id);
  return { ...project, quotations, paymentInstallments };
}
```

- [ ] **Step 3: Add `markProjectDeliveredAdmin`**

Add this function after `declineProjectAdmin` (after current line 107, before `module.exports`):
```js
// Admin/staff-only. Gated purely on payment completion -- ALL of a
// project's payment_installments must be 'paid' -- not on status_code, per
// docs/superpowers/specs/2026-07-18-payment-installment-plan-design.md:
// delivery readiness is a build/QA judgment call, independent of exact
// status-sequencing.
async function markProjectDeliveredAdmin(id) {
  const project = await projectsRepo.findById(id);
  if (!project) throw httpError(404, 'Project not found');

  const totalInstallments = await paymentInstallmentsRepo.countForProject(id);
  if (totalInstallments === 0) {
    throw httpError(409, 'This project has no payment schedule yet; nothing to deliver against');
  }

  const pendingInstallments = await paymentInstallmentsRepo.countPending(id);
  if (pendingInstallments > 0) {
    throw httpError(409, `Project is not fully paid; ${pendingInstallments} installment(s) remaining`);
  }

  const updated = await projectsRepo.updateStatus(id, 'delivered');
  logger.info(`${TAG} Project ${id} marked delivered`);
  return updated;
}
```

- [ ] **Step 4: Export it**

Replace the `module.exports` block (current lines 109-118):
```js
module.exports = {
  createProject,
  listProjectsForClient,
  getProjectForClient,
  listProjectsAdmin,
  getProjectAdmin,
  updateProjectStatusAdmin,
  acceptProjectAdmin,
  declineProjectAdmin,
};
```

with:
```js
module.exports = {
  createProject,
  listProjectsForClient,
  getProjectForClient,
  listProjectsAdmin,
  getProjectAdmin,
  updateProjectStatusAdmin,
  acceptProjectAdmin,
  declineProjectAdmin,
  markProjectDeliveredAdmin,
};
```

- [ ] **Step 5: Verify against the real dev DB**

Run (from `backend/`):
```bash
node -e "
require('dotenv').config();
const pool = require('./src/config/database');
const projectsRepo = require('./src/repositories/projects.repository');
const quotationsRepo = require('./src/repositories/quotations.repository');
const quotationsService = require('./src/services/quotations.service');
const paymentsService = require('./src/services/payments.service');
const projectsService = require('./src/services/projects.service');

(async () => {
  const { rows: [clientUser] } = await pool.query(\"SELECT user_id FROM users WHERE role = 'CLIENT' LIMIT 1\");
  const { rows: [adminUser] } = await pool.query(\"SELECT user_id FROM users WHERE role = 'ADMIN' LIMIT 1\");
  const project = await projectsRepo.create({ clientId: clientUser.user_id, packageId: '11111111-1111-1111-1111-111111111101', title: 'Task4 verify', requestDetails: null });
  const quotation = await quotationsRepo.insert({ projectId: project.id, packageId: '11111111-1111-1111-1111-111111111101', basePrice: 25000, totalAmount: 25000, status: 'sent', sentAt: new Date() });
  await quotationsService.respondToQuotation({ projectId: project.id, quotationId: quotation.id, clientId: clientUser.user_id, decision: 'accept' });

  // Deliver before any payment: must reject
  try {
    await projectsService.markProjectDeliveredAdmin(project.id);
    console.log('deliver before paid rejected: FAIL (did not throw)');
  } catch (e) {
    console.log('deliver before paid rejected:', e.statusCode === 409 ? 'OK' : 'FAIL');
  }

  // Pay and verify all 5 installments (amounts: 12500, 5000, 2500, 2500, 2500)
  for (const amount of [12500, 5000, 2500, 2500, 2500]) {
    const payment = await paymentsService.createPayment({ projectId: project.id, clientId: clientUser.user_id, paymentMethod: 'gcash', amount, referenceNumber: 'R', proofOfPaymentUrl: 'uploads/x.png' });
    await paymentsService.verifyPayment(payment.id, adminUser.user_id);
  }

  const delivered = await projectsService.markProjectDeliveredAdmin(project.id);
  console.log('delivered after full payment:', delivered.status_code === 'delivered' ? 'OK' : \`FAIL (\${delivered.status_code})\`);

  const detail = await projectsService.getProjectAdmin(project.id);
  console.log('paymentInstallments nested, all paid:', detail.paymentInstallments.length === 5 && detail.paymentInstallments.every(i => i.status === 'paid') ? 'OK' : 'FAIL');

  await pool.query('DELETE FROM projects WHERE id = \$1', [project.id]);
  process.exit(0);
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
"
```

Expected output:
```
deliver before paid rejected: OK
delivered after full payment: OK
paymentInstallments nested, all paid: OK
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/projects.service.js
git commit -m "feat: add markProjectDeliveredAdmin and nest payment schedule into project reads"
```

---

### Task 5: Wire the "Mark Delivered" HTTP endpoint

**Files:**
- Modify: `backend/src/controllers/adminProjects.controller.js`
- Modify: `backend/src/routes/adminProjects.route.js`

**Interfaces:**
- Consumes: `projectsService.markProjectDeliveredAdmin` from Task 4.
- Produces: `PATCH /admin/projects/:id/deliver` (admin/staff only, per the router's existing `requireRole('admin', 'staff')` blanket gate).

- [ ] **Step 1: Add the controller action**

In `backend/src/controllers/adminProjects.controller.js`, add after `exports.decline` (after current line 52, before `exports.createAndSendQuotation`):
```js
exports.deliver = async (req, res, next) => {
  try {
    const project = await projectsService.markProjectDeliveredAdmin(req.params.id);
    res.status(200).json({ success: true, message: 'Project marked as delivered', data: project });
  } catch (error) {
    next(toHttpError(error));
  }
};
```

- [ ] **Step 2: Add the route**

In `backend/src/routes/adminProjects.route.js`, add after line 16 (`router.patch('/:id/decline', adminProjectsController.decline);`):
```js
router.patch('/:id/deliver', adminProjectsController.deliver);
```

- [ ] **Step 3: Verify wiring**

There's no seeded-credential path to drive this through a real HTTP request in this repo (no known plaintext passwords for the seeded users), so verify structurally instead — that the controller exports the action and the router registers the route with the right method:
```bash
node -e "
const controller = require('./src/controllers/adminProjects.controller');
console.log('controller.deliver exists:', typeof controller.deliver === 'function' ? 'OK' : 'FAIL');

const router = require('./src/routes/adminProjects.route');
const layer = router.stack.find((l) => l.route && l.route.path === '/:id/deliver' && l.route.methods.patch);
console.log('route registered:', layer ? 'OK' : 'FAIL');
"
```

Expected output:
```
controller.deliver exists: OK
route registered: OK
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/controllers/adminProjects.controller.js backend/src/routes/adminProjects.route.js
git commit -m "feat: add PATCH /admin/projects/:id/deliver endpoint"
```
