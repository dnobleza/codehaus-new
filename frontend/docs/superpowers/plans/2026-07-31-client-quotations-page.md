# Client Quotations Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give clients a Quotations section in the sidebar where every quotation they have received is listed and each one opens to a clear view of total cost plus the installment breakdown — including a projected schedule before acceptance.

**Architecture:** One new client-scoped backend endpoint (`GET /quotations`) returns a flat list of the caller's quotations. The detail page reuses the existing `GET /projects/:id`, which already nests quotations with addon line items, so no per-quotation endpoint is needed. The payment receipt and payment schedule move out of the project Invoices tab into this new section; before acceptance, a frontend-computed projected schedule mirrors the backend's fixed installment generator.

**Tech Stack:** Backend — Node.js, Express 5, `pg` (raw parameterized SQL, repository pattern). Frontend — React 19, TypeScript, Vite, Tailwind v4, TanStack Query, React Router, Vitest + Testing Library.

**Spec:** `frontend/docs/superpowers/specs/2026-07-31-client-quotations-page-design.md`

## Global Constraints

- **Client role only.** Do not touch `STAFF_NAV_ITEMS`, `ADMIN_NAV_ITEMS`, `AdminProjectDetailPage`, `AdminQuotationBuilder`, or any `/admin/*` route or API module.
- **Installment schedule is fixed:** `[50, 20, 10, 10, 10]` percent, 7-day spacing. Installments 1–4 round to the cent; installment 5 absorbs the remainder so rows sum to the total exactly.
- **Money from the API arrives as strings.** Postgres `NUMERIC` columns serialize as strings via `pg`. Always pass through `toNumber` / `formatPHP` from `@/shared/utils/currency`.
- **Never display absolute due dates for a projected schedule.** The backend anchors real due dates at acceptance time; pre-acceptance dates would be unhonored promises. Use relative labels only.
- **All SQL parameterized.** Ownership scoping belongs in the SQL predicate, never a post-filter.
- **Layers:** controllers thin, business rules in services, SQL in repositories. Every repository function takes `db = pool` as its last argument.
- **Backend has no test script.** Backend tasks are verified by manual QA; only frontend tasks have automated tests.
- **Commit format:** Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`).
- **Branch:** `feat/client-quotations-page` (already created; the design spec is its first commit).

---

### Task 1: Backend `GET /quotations` endpoint

**Files:**
- Modify: `backend/src/repositories/quotations.repository.js` (add `listByClient`, extend `module.exports` at line 111)
- Modify: `backend/src/services/quotations.service.js` (add `listQuotationsForClient`, extend `module.exports` at line 388)
- Modify: `backend/src/controllers/quotations.controller.js` (add `exports.list`)
- Create: `backend/src/routes/quotations.route.js`
- Modify: `backend/app.js` (require + mount)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `GET /quotations` → `{ success: true, message: string, data: QuotationListRow[] }` where each row is
  `{ id: string, quotation_number: string, status: string, total_amount: string, created_at: string, project_id: string, project_title: string }`.
  Task 2 types this response frontend-side.

- [ ] **Step 1: Add the repository function**

In `backend/src/repositories/quotations.repository.js`, add this above `module.exports`:

```js
// Every quotation belonging to the caller's own projects, newest first.
// Ownership is enforced by the join predicate itself (p.client_id = $1), not
// by filtering afterwards. Addon line items are deliberately NOT joined --
// the list view doesn't render them, and the detail view reads them from
// GET /projects/:id, which already nests them via listByProjectWithAddons.
async function listByClient(clientId, db = pool) {
  const { rows } = await db.query(
    `SELECT q.id,
            q.quotation_number,
            q.status,
            q.total_amount,
            q.created_at,
            q.project_id,
            p.title AS project_title
     FROM quotations q
     JOIN projects p ON p.id = q.project_id
     WHERE p.client_id = $1
     ORDER BY q.created_at DESC`,
    [clientId]
  );
  return rows;
}
```

Then add `listByClient,` to the `module.exports` object.

- [ ] **Step 2: Add the service function**

In `backend/src/services/quotations.service.js`, add above `module.exports`:

```js
// A client reading their own quotations -- no business rules apply, so this
// is a deliberate pass-through rather than an artificial abstraction. The
// ownership scope lives in the repository's SQL predicate.
async function listQuotationsForClient(clientId) {
  return quotationsRepo.listByClient(clientId);
}
```

Then add `listQuotationsForClient,` to the `module.exports` object.

Verify the repository is already imported at the top of the file as `quotationsRepo` — it is, alongside `projectsRepo` and `packagesRepo`. Do not add a duplicate require.

- [ ] **Step 3: Add the controller handler**

In `backend/src/controllers/quotations.controller.js`, append:

```js
// Client's own quotations across all their projects (GET /quotations).
// clientId always comes from the verified JWT subject, never from the request.
exports.list = async (req, res, next) => {
  try {
    const quotations = await quotationsService.listQuotationsForClient(req.user.id);
    res.status(200).json({ success: true, message: 'Quotations retrieved successfully', data: quotations });
  } catch (error) {
    next(toHttpError(error));
  }
};
```

- [ ] **Step 4: Create the route file**

Create `backend/src/routes/quotations.route.js`:

```js
const express = require('express');
const router = express.Router();

const quotationsController = require('../controllers/quotations.controller');
const { verifyAccessToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/requireRole.middleware');

// Client-scoped, cross-project quotation list. The per-quotation write
// actions (create/accept/reject) stay nested under /projects/:id/quotations
// in projects.route.js -- they act on a specific project and are scoped by
// that project's ownership. This file only adds the flat read surface the
// client Quotations page needs, scoped to req.user.id inside the repository
// query (quotations.repository.js#listByClient).
router.use(verifyAccessToken);

router.get('/', requireRole('client'), quotationsController.list);

module.exports = router;
```

- [ ] **Step 5: Mount the route**

In `backend/app.js`, add after the `projectsRoutes` require (line 13):

```js
const quotationsRoutes = require('./src/routes/quotations.route');
```

and after `app.use('/projects', projectsRoutes);` (line 57):

```js
app.use('/quotations', quotationsRoutes);
```

- [ ] **Step 6: Manual verification**

Run `npm --prefix backend run dev`. With a client account's access token:

```bash
curl -s -H "Authorization: Bearer <CLIENT_TOKEN>" http://localhost:3000/quotations
```

Expected: `200` with a `data` array; every row has `project_title` and belongs to that client's projects only.

```bash
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer <ADMIN_TOKEN>" http://localhost:3000/quotations
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/quotations
```

Expected: `403` for the admin token (wrong role), `401` with no token.

- [ ] **Step 7: Commit**

```bash
git add backend/src/repositories/quotations.repository.js backend/src/services/quotations.service.js backend/src/controllers/quotations.controller.js backend/src/routes/quotations.route.js backend/app.js
git commit -m "feat: add client-scoped GET /quotations list endpoint"
```

---

### Task 2: Frontend data layer for the quotation list

**Files:**
- Modify: `frontend/src/shared/types/quotation.types.ts`
- Modify: `frontend/src/shared/api/queryKeys.ts`
- Modify: `frontend/src/modules/quotations/api/quotations.api.ts`
- Modify: `frontend/src/modules/quotations/api/quotations.queries.ts`

**Interfaces:**
- Consumes: `GET /quotations` from Task 1.
- Produces:
  - `QuotationListItem` (type) — used by Task 5.
  - `quotationsApi.listMine(): Promise<QuotationListItem[]>`
  - `useMyQuotations()` — TanStack Query hook returning `QuotationListItem[]`, used by Task 5.
  - `queryKeys.quotations.list()` — invalidated by the accept/reject mutations.

- [ ] **Step 1: Add the list-row type**

In `frontend/src/shared/types/quotation.types.ts`, append:

```ts
/**
 * Flat list row from `GET /quotations` — the client's quotations across all
 * their projects. Deliberately NOT the same shape as `Quotation` above: the
 * list query joins only what the table renders and never fetches addon line
 * items, but it does carry `project_title` from the joined `projects` row,
 * which the nested `Quotation` has no reason to include.
 */
export interface QuotationListItem {
  id: string;
  quotation_number: string;
  status: QuotationStatus;
  /** NUMERIC(12,2) as a string. */
  total_amount: string;
  created_at: string;
  project_id: string;
  project_title: string;
}
```

- [ ] **Step 2: Add the query keys**

In `frontend/src/shared/api/queryKeys.ts`, add a `quotations` entry after the `projects` block:

```ts
  quotations: {
    all: ['quotations'] as const,
    // Client's own cross-project quotation list (GET /quotations). There is
    // no `detail` key: the quotation detail page reads its quotation out of
    // the parent project's `projects.detail` query rather than fetching one
    // directly, since the API has no GET /quotations/:id.
    list: () => [...queryKeys.quotations.all, 'list'] as const,
  },
```

- [ ] **Step 3: Add the API call**

In `frontend/src/modules/quotations/api/quotations.api.ts`, import the new type:

```ts
import type { Quotation, QuotationListItem } from '@/shared/types/quotation.types';
```

Replace the `quotationsApi` doc comment (lines 18–23) with:

```ts
/**
 * Raw REST calls for the quotation domain. There is no
 * `GET /quotations/:id` in this API — a single quotation is always read
 * nested inside its parent `Project` (see
 * `modules/projects/api/projects.api.ts`). `list()` below is the one flat
 * read surface: a cross-project list for the client's Quotations page,
 * scoped server-side to the caller's own projects.
 */
```

and add as the first method inside `quotationsApi`:

```ts
  /** The caller's own quotations across every project they own, newest first. */
  async listMine(): Promise<QuotationListItem[]> {
    const response = await apiClient.get<ApiEnvelope<QuotationListItem[]>>('/quotations');
    return response.data.data;
  },
```

- [ ] **Step 4: Add the query hook and invalidate the list on accept/reject**

In `frontend/src/modules/quotations/api/quotations.queries.ts`, change the import on line 1 to:

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
```

Add above `useCreateQuotation`:

```ts
/** Client's own quotations across all their projects — backs the Quotations list page. */
export function useMyQuotations() {
  return useQuery({
    queryKey: queryKeys.quotations.list(),
    queryFn: () => quotationsApi.listMine(),
  });
}
```

Accepting or rejecting changes a quotation's status, which the list page
renders, so both mutations must invalidate the list too. In
`useAcceptQuotation` and `useRejectQuotation`, replace each `onSuccess` body
with:

```ts
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.quotations.list() });
    },
```

- [ ] **Step 5: Verify it compiles**

Run: `npm --prefix frontend run build`
Expected: build succeeds, no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/shared/types/quotation.types.ts frontend/src/shared/api/queryKeys.ts frontend/src/modules/quotations/api/quotations.api.ts frontend/src/modules/quotations/api/quotations.queries.ts
git commit -m "feat: add client quotation list query and types"
```

---

### Task 3: Projected installment schedule utility

**Files:**
- Create: `frontend/src/modules/payments/utils/projectedSchedule.ts`
- Test: `frontend/src/modules/payments/utils/projectedSchedule.test.ts`

**Interfaces:**
- Consumes: `toNumber` from `@/shared/utils/currency`.
- Produces:
  - `ProjectedInstallment` = `{ sequence: number; percentage: number; amount: number }`
  - `computeProjectedInstallments(total: number | string): ProjectedInstallment[]`
  - `formatProjectedDueLabel(sequence: number): string`

  Both used by Task 4.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/modules/payments/utils/projectedSchedule.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

import { computeProjectedInstallments, formatProjectedDueLabel } from './projectedSchedule';

describe('computeProjectedInstallments', () => {
  it('splits a round total into the fixed 50/20/10/10/10 schedule', () => {
    const result = computeProjectedInstallments(50000);

    expect(result.map((row) => row.percentage)).toEqual([50, 20, 10, 10, 10]);
    expect(result.map((row) => row.amount)).toEqual([25000, 10000, 5000, 5000, 5000]);
    expect(result.map((row) => row.sequence)).toEqual([1, 2, 3, 4, 5]);
  });

  it('accepts a numeric string, as money arrives from the API', () => {
    const result = computeProjectedInstallments('50000.00');

    expect(result[0].amount).toBe(25000);
  });

  it('absorbs the rounding remainder on the final installment so rows sum exactly', () => {
    const result = computeProjectedInstallments(99999.99);
    const sum = result.reduce((total, row) => total + row.amount, 0);

    expect(Math.round(sum * 100) / 100).toBe(99999.99);
    expect(result[4].amount).toBe(9999.99);
  });

  it('returns no rows for a zero total', () => {
    expect(computeProjectedInstallments(0)).toEqual([]);
  });

  it('returns no rows for a negative total', () => {
    expect(computeProjectedInstallments(-100)).toEqual([]);
  });
});

describe('formatProjectedDueLabel', () => {
  it('labels the downpayment as due on acceptance', () => {
    expect(formatProjectedDueLabel(1)).toBe('On acceptance');
  });

  it('labels the second installment as one week after, singular', () => {
    expect(formatProjectedDueLabel(2)).toBe('1 week after');
  });

  it('labels later installments in plural weeks', () => {
    expect(formatProjectedDueLabel(5)).toBe('4 weeks after');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm --prefix frontend test -- projectedSchedule`
Expected: FAIL — cannot resolve `./projectedSchedule`.

- [ ] **Step 3: Write the implementation**

Create `frontend/src/modules/payments/utils/projectedSchedule.ts`:

```ts
import { toNumber } from '@/shared/utils/currency';

/**
 * Mirrors `backend/src/services/quotations.service.js`'s
 * INSTALLMENT_PERCENTAGES exactly. Duplicated rather than fetched because
 * the real installment rows don't exist until the client accepts the
 * quotation — this is a preview of what the server WILL generate, shown at
 * decision time so the payment commitment is visible before acceptance.
 * If the backend schedule ever changes, this constant must change with it.
 */
const INSTALLMENT_PERCENTAGES = [50, 20, 10, 10, 10];

/** Same cent-rounding the backend's `toMoney` applies, so both sides agree to the cent. */
function toMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export interface ProjectedInstallment {
  sequence: number;
  percentage: number;
  amount: number;
}

/**
 * Projects the fixed installment schedule for a quotation total. Carries no
 * dates and no status: the server anchors real due dates to acceptance time,
 * so absolute dates cannot be known here (see `formatProjectedDueLabel`).
 *
 * Installments 1-4 round to the cent from their percentage and installment 5
 * absorbs whatever remainder is left, so the rows always sum to EXACTLY the
 * total — matching `generateInstallmentSchedule` server-side.
 *
 * Returns an empty array for a zero or negative total: a ₱0 quotation has no
 * meaningful schedule, and rendering five ₱0 rows would be misleading (see
 * the known ₱0-quote gap in CLAUDE.md).
 */
export function computeProjectedInstallments(total: number | string): ProjectedInstallment[] {
  const totalAmount = toMoney(toNumber(total));
  if (totalAmount <= 0) return [];

  const amounts = INSTALLMENT_PERCENTAGES.slice(0, -1).map((percentage) =>
    toMoney((totalAmount * percentage) / 100),
  );
  const amountSoFar = amounts.reduce((sum, amount) => sum + amount, 0);
  amounts.push(toMoney(totalAmount - amountSoFar));

  return INSTALLMENT_PERCENTAGES.map((percentage, index) => ({
    sequence: index + 1,
    percentage,
    amount: amounts[index],
  }));
}

/**
 * Relative due label for a projected installment. Deliberately relative:
 * the backend anchors due dates to schedule-generation time (i.e. the moment
 * the client accepts), so any absolute date shown before acceptance would be
 * a date the server never honors.
 */
export function formatProjectedDueLabel(sequence: number): string {
  if (sequence === 1) return 'On acceptance';
  const weeks = sequence - 1;
  return `${weeks} week${weeks === 1 ? '' : 's'} after`;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm --prefix frontend test -- projectedSchedule`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/modules/payments/utils/projectedSchedule.ts frontend/src/modules/payments/utils/projectedSchedule.test.ts
git commit -m "feat: add projected installment schedule utility"
```

---

### Task 4: `PaymentScheduleCard` projected mode

**Files:**
- Modify: `frontend/src/modules/payments/components/PaymentScheduleCard.tsx`
- Test: `frontend/src/modules/payments/components/PaymentScheduleCard.test.tsx` (create)

**Interfaces:**
- Consumes: `ProjectedInstallment`, `formatProjectedDueLabel` from Task 3.
- Produces: `PaymentScheduleCard` accepting either `{ installments }` (unchanged) or `{ projected }`. Task 6 uses the `projected` form.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/modules/payments/components/PaymentScheduleCard.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { PaymentScheduleCard } from './PaymentScheduleCard';
import { computeProjectedInstallments } from '../utils/projectedSchedule';
import type { PaymentInstallment } from '@/shared/types/payment.types';

const actualInstallments: PaymentInstallment[] = [
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
    due_date: '2099-07-08',
    status: 'pending',
    created_at: '2026-07-01',
  },
];

describe('PaymentScheduleCard', () => {
  it('renders real due dates and paid progress in actual mode', () => {
    render(<PaymentScheduleCard installments={actualInstallments} />);

    expect(screen.getByText('Payment Schedule')).toBeInTheDocument();
    expect(screen.getByText('1 of 2 paid')).toBeInTheDocument();
    expect(screen.getAllByText('Jul 1, 2026').length).toBeGreaterThan(0);
  });

  it('renders nothing when there are no installments', () => {
    const { container } = render(<PaymentScheduleCard installments={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders relative due labels and no status badges in projected mode', () => {
    render(<PaymentScheduleCard projected={computeProjectedInstallments(50000)} />);

    expect(screen.getAllByText('On acceptance').length).toBeGreaterThan(0);
    expect(screen.getAllByText('4 weeks after').length).toBeGreaterThan(0);
    expect(screen.queryByText('Pending')).not.toBeInTheDocument();
    expect(screen.queryByText('Paid')).not.toBeInTheDocument();
    expect(screen.queryByText(/of \d+ paid/)).not.toBeInTheDocument();
  });

  it('renders nothing in projected mode when the total produced no rows', () => {
    const { container } = render(<PaymentScheduleCard projected={computeProjectedInstallments(0)} />);

    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm --prefix frontend test -- PaymentScheduleCard`
Expected: FAIL — the `projected` prop does not exist; the projected-mode assertions fail.

- [ ] **Step 3: Rework the component**

In `frontend/src/modules/payments/components/PaymentScheduleCard.tsx`:

Add to the imports:

```tsx
import {
  formatProjectedDueLabel,
  type ProjectedInstallment,
} from '../utils/projectedSchedule';
```

Replace the `PaymentScheduleCardProps` interface (lines 8–10) with:

```tsx
/**
 * Two mutually exclusive modes, one component:
 *
 * - `installments` — the server's real `payment_installments` rows, which
 *   only exist once a quotation has been accepted. Absolute due dates,
 *   Paid/Pending/Overdue badges, paid-count footer.
 * - `projected` — a pre-acceptance preview from
 *   `computeProjectedInstallments`. Relative due labels (the server anchors
 *   real dates at acceptance time), no status badges (nothing has a status
 *   yet), and a total in the footer instead of a paid count.
 */
type PaymentScheduleCardProps =
  | { installments: PaymentInstallment[] | undefined; projected?: never }
  | { projected: ProjectedInstallment[]; installments?: never };
```

Replace the component's signature and body opening (lines 79–86) with:

```tsx
export function PaymentScheduleCard(props: PaymentScheduleCardProps) {
  const isProjected = props.projected !== undefined;
  const rows: Array<PaymentInstallment | ProjectedInstallment> = isProjected
    ? props.projected
    : (props.installments ?? []);

  if (rows.length === 0) return null;

  const actualRows = isProjected ? [] : (props.installments ?? []);
  const paidCount = actualRows.filter((installment) => installment.status === 'paid').length;
  const remainingBalance = actualRows
    .filter((installment) => installment.status === 'pending')
    .reduce((sum, installment) => sum + toNumber(installment.amount), 0);
  const projectedTotal = isProjected
    ? props.projected.reduce((sum, row) => sum + row.amount, 0)
    : 0;
```

Then, in both the desktop table body and the mobile list, iterate `rows`
instead of `installments`, keying by `isProjected ? row.sequence : row.id`,
and render the due-date and status cells conditionally. The desktop `<tbody>`
becomes:

```tsx
            <tbody>
              {rows.map((row) => {
                const presentation = isProjected
                  ? null
                  : getStatusPresentation(row as PaymentInstallment);
                return (
                  <tr
                    key={isProjected ? row.sequence : (row as PaymentInstallment).id}
                    className="h-11 border-b border-border last:border-0"
                  >
                    <td className="px-2 font-medium text-foreground">
                      {getInstallmentLabel(row.sequence)}
                    </td>
                    <td className="px-2 text-foreground">{toNumber(row.percentage)}%</td>
                    <td className="px-2 text-foreground">{formatPHP(row.amount)}</td>
                    <td className="px-2 text-foreground">
                      {isProjected
                        ? formatProjectedDueLabel(row.sequence)
                        : formatDueDate((row as PaymentInstallment).due_date)}
                    </td>
                    {presentation && (
                      <td className="px-2">
                        <Badge variant={presentation.variant}>
                          <presentation.Icon className="size-3" aria-hidden="true" />
                          {presentation.label}
                        </Badge>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
```

The Status `<th>` must render only in actual mode — wrap it in
`{!isProjected && (...)}` so the header and body column counts stay in sync.

Apply the same treatment to the mobile `<ul>`: key on
`isProjected ? row.sequence : row.id`, drop the `Badge` when `isProjected`,
and use `formatProjectedDueLabel(row.sequence)` for the due-date `<dd>`.

Replace the `CardFooter` (lines 174–184) with:

```tsx
      <CardFooter className="flex flex-wrap items-center justify-between gap-2 text-sm">
        {isProjected ? (
          <>
            <span className="text-muted-foreground">
              This schedule starts once you accept the quotation.
            </span>
            <span className="font-medium text-foreground">
              Total: <span className="font-semibold">{formatPHP(projectedTotal)}</span>
            </span>
          </>
        ) : (
          <>
            <span className="font-medium text-foreground">
              {paidCount} of {rows.length} paid
            </span>
            {remainingBalance > 0 && (
              <span className="text-muted-foreground">
                Remaining balance:{' '}
                <span className="font-semibold text-foreground">{formatPHP(remainingBalance)}</span>
              </span>
            )}
          </>
        )}
      </CardFooter>
```

Update the component's doc comment (lines 72–78) to describe both modes.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm --prefix frontend test -- PaymentScheduleCard`
Expected: PASS, 4 tests.

- [ ] **Step 5: Verify existing callers still typecheck**

Run: `npm --prefix frontend run build`
Expected: success. `AdminProjectDetailPage.tsx:337` and `PaymentReceiptCard.tsx:96` both pass `installments={...}` and must still satisfy the union unchanged.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/modules/payments/components/PaymentScheduleCard.tsx frontend/src/modules/payments/components/PaymentScheduleCard.test.tsx
git commit -m "feat: add projected mode to PaymentScheduleCard"
```

---

### Task 5: Quotations list page, route, and nav

**Files:**
- Create: `frontend/src/modules/quotations/utils/quotationStatus.ts`
- Create: `frontend/src/modules/quotations/pages/QuotationsListPage.tsx`
- Test: `frontend/src/modules/quotations/pages/QuotationsListPage.test.tsx`
- Modify: `frontend/src/app/router/index.tsx`
- Modify: `frontend/src/shared/layouts/dashboardNav.config.ts:30`

**Interfaces:**
- Consumes: `useMyQuotations`, `QuotationListItem` from Task 2.
- Produces:
  - `QUOTATION_STATUS_LABELS: Record<QuotationStatus, string>` and `QUOTATION_STATUS_BADGE_VARIANT: Record<QuotationStatus, BadgeProps['variant']>` — both reused by Task 6.
  - Route `/client/dashboard/quotations`.
  - Detail links of the form `/client/dashboard/quotations/:projectId/:quotationId`, which Task 6 registers.

- [ ] **Step 1: Add the status presentation map**

Create `frontend/src/modules/quotations/utils/quotationStatus.ts`:

```ts
import type { BadgeProps } from '@/components/ui/badge';
import type { QuotationStatus } from '@/shared/types/quotation.types';

/**
 * Client-facing quotation status copy. Deliberately phrased from the
 * client's point of view rather than echoing the raw enum — "Awaiting your
 * response" tells them there's something to do; "sent" does not.
 */
export const QUOTATION_STATUS_LABELS: Record<QuotationStatus, string> = {
  draft: 'Being prepared',
  sent: 'Awaiting your response',
  accepted: 'Accepted',
  rejected: 'Changes requested',
  expired: 'Expired',
};

/** Quotation status → Badge variant, per design-system.md §5. */
export const QUOTATION_STATUS_BADGE_VARIANT: Record<QuotationStatus, BadgeProps['variant']> = {
  draft: 'neutral',
  sent: 'info',
  accepted: 'success',
  rejected: 'warning',
  expired: 'neutral',
};
```

- [ ] **Step 2: Write the failing test**

Create `frontend/src/modules/quotations/pages/QuotationsListPage.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../api/quotations.queries', () => ({
  useMyQuotations: vi.fn(),
}));

import { useMyQuotations } from '../api/quotations.queries';
import { QuotationsListPage } from './QuotationsListPage';
import type { QuotationListItem } from '@/shared/types/quotation.types';

const rows: QuotationListItem[] = [
  {
    id: 'q-1',
    quotation_number: 'QUO-0001',
    status: 'sent',
    total_amount: '50000.00',
    created_at: '2026-07-01',
    project_id: 'proj-1',
    project_title: 'Business Package',
  },
];

function mockQuery(value: unknown) {
  vi.mocked(useMyQuotations).mockReturnValue(value as ReturnType<typeof useMyQuotations>);
}

describe('QuotationsListPage', () => {
  it('lists each quotation with its project, status, and total', () => {
    mockQuery({ data: rows, isLoading: false, isError: false, refetch: vi.fn() });

    render(
      <MemoryRouter>
        <QuotationsListPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('QUO-0001')).toBeInTheDocument();
    expect(screen.getByText('Business Package')).toBeInTheDocument();
    expect(screen.getByText('Awaiting your response')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'QUO-0001' })).toHaveAttribute(
      'href',
      '/client/dashboard/quotations/proj-1/q-1',
    );
  });

  it('shows an empty message when the client has no quotations', () => {
    mockQuery({ data: [], isLoading: false, isError: false, refetch: vi.fn() });

    render(
      <MemoryRouter>
        <QuotationsListPage />
      </MemoryRouter>,
    );

    expect(screen.getByText(/haven't received any quotations/i)).toBeInTheDocument();
  });

  it('shows the error state when the request fails', () => {
    mockQuery({ data: undefined, isLoading: false, isError: true, refetch: vi.fn() });

    render(
      <MemoryRouter>
        <QuotationsListPage />
      </MemoryRouter>,
    );

    expect(screen.queryByText('QUO-0001')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm --prefix frontend test -- QuotationsListPage`
Expected: FAIL — cannot resolve `./QuotationsListPage`.

- [ ] **Step 4: Write the page**

Create `frontend/src/modules/quotations/pages/QuotationsListPage.tsx`:

```tsx
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/shared/components/feature/DataTable';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { LoadingSpinner } from '@/shared/components/common/LoadingSpinner';
import { formatPHP } from '@/shared/utils/currency';
import { useMyQuotations } from '../api/quotations.queries';
import { QUOTATION_STATUS_BADGE_VARIANT, QUOTATION_STATUS_LABELS } from '../utils/quotationStatus';

/**
 * Client's quotations across every project they own (design-system.md §3.8
 * table-first pattern, same shape as `ProjectsListPage`). Each row links to
 * the detail page by `projectId/quotationId` — the API has no
 * `GET /quotations/:id`, so the detail page reads its quotation out of the
 * parent project.
 */
export function QuotationsListPage() {
  const { data: quotations, isLoading, isError, refetch } = useMyQuotations();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Quotations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every quotation CodeHaus has prepared for you, with the full cost breakdown and payment
          schedule.
        </p>
      </div>

      {isLoading && <LoadingSpinner label="Loading your quotations..." />}

      {isError && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !isError && (
        <DataTable
          columns={[
            {
              header: 'Quotation',
              accessor: (row) => (
                <Link
                  to={`/client/dashboard/quotations/${row.project_id}/${row.id}`}
                  className="font-medium text-foreground hover:text-primary hover:underline"
                >
                  {row.quotation_number}
                </Link>
              ),
            },
            { header: 'Project', accessor: (row) => row.project_title },
            {
              header: 'Status',
              accessor: (row) => (
                <Badge variant={QUOTATION_STATUS_BADGE_VARIANT[row.status]}>
                  {QUOTATION_STATUS_LABELS[row.status]}
                </Badge>
              ),
            },
            {
              header: 'Total',
              accessor: (row) => formatPHP(row.total_amount),
              className: 'text-right',
            },
            {
              header: 'Received',
              accessor: (row) => new Date(row.created_at).toLocaleDateString(),
              className: 'text-right',
            },
          ]}
          rows={quotations ?? []}
          getRowKey={(row) => row.id}
          emptyMessage="You haven't received any quotations yet."
        />
      )}
    </div>
  );
}

export default QuotationsListPage;
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm --prefix frontend test -- QuotationsListPage`
Expected: PASS, 3 tests.

- [ ] **Step 6: Register the route**

In `frontend/src/app/router/index.tsx`, inside the `client/dashboard` children array (after the `projects/:id` entry, line 62), add:

```tsx
              {
                path: 'quotations',
                lazy: lazyPage(() => import('@/modules/quotations/pages/QuotationsListPage')),
              },
```

- [ ] **Step 7: Enable the nav item**

In `frontend/src/shared/layouts/dashboardNav.config.ts`, replace line 30 with:

```ts
  { label: 'Quotations', icon: FileText, path: '/client/dashboard/quotations' },
```

Leave `STAFF_NAV_ITEMS` and `ADMIN_NAV_ITEMS` untouched.

- [ ] **Step 8: Verify**

Run: `npm --prefix frontend run build`
Expected: success.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/modules/quotations/utils/quotationStatus.ts frontend/src/modules/quotations/pages/QuotationsListPage.tsx frontend/src/modules/quotations/pages/QuotationsListPage.test.tsx frontend/src/app/router/index.tsx frontend/src/shared/layouts/dashboardNav.config.ts
git commit -m "feat: add client quotations list page and nav entry"
```

---

### Task 6: Quotation detail page

**Files:**
- Create: `frontend/src/modules/quotations/pages/QuotationDetailPage.tsx`
- Test: `frontend/src/modules/quotations/pages/QuotationDetailPage.test.tsx`
- Modify: `frontend/src/app/router/index.tsx`

**Interfaces:**
- Consumes: `useProject` (`@/modules/projects/api/projects.queries`), `useProjectPayments` (`@/modules/payments/api/payments.queries`), `useAcceptQuotation` / `useRejectQuotation` (Task 2), `computeProjectedInstallments` (Task 3), `PaymentScheduleCard` projected mode (Task 4), `QUOTATION_STATUS_*` maps (Task 5), plus the existing `QuotationSummaryCard` and `PaymentReceiptCard`.
- Produces: route `/client/dashboard/quotations/:projectId/:quotationId`.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/modules/quotations/pages/QuotationDetailPage.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('@/modules/projects/api/projects.queries', () => ({ useProject: vi.fn() }));
vi.mock('@/modules/payments/api/payments.queries', () => ({ useProjectPayments: vi.fn() }));
vi.mock('@/modules/packages/api/packages.queries', () => ({ usePackage: vi.fn() }));
vi.mock('../api/quotations.queries', () => ({
  useAcceptQuotation: vi.fn(),
  useRejectQuotation: vi.fn(),
}));

import { useProject } from '@/modules/projects/api/projects.queries';
import { useProjectPayments } from '@/modules/payments/api/payments.queries';
import { usePackage } from '@/modules/packages/api/packages.queries';
import { useAcceptQuotation, useRejectQuotation } from '../api/quotations.queries';
import { QuotationDetailPage } from './QuotationDetailPage';
import type { Project } from '@/shared/types/project.types';
import type { Quotation, QuotationStatus } from '@/shared/types/quotation.types';

const quotation: Quotation = {
  id: 'q-1',
  quotation_number: 'QUO-0001',
  project_id: 'proj-1',
  package_id: 'pkg-1',
  base_price: '45000.00',
  estimated_timeline_min_days: 14,
  estimated_timeline_max_days: 21,
  discount_amount: '0.00',
  total_amount: '50000.00',
  status: 'sent',
  created_at: '2026-07-01',
  sent_at: '2026-07-01',
  responded_at: null,
  addons: [{ addonId: 'a1', name: 'Extra Revision', category: 'dashboard', priceAtTime: 5000 }],
};

const project: Project = {
  id: 'proj-1',
  client_id: 1,
  package_id: 'pkg-1',
  title: 'Business Package',
  request_details: null,
  status_code: 'quoted',
  decline_reason: null,
  timeline_estimate_min_days: null,
  timeline_estimate_max_days: null,
  start_date: null,
  end_date: null,
  completion_date: null,
  created_at: '2026-07-01',
  updated_at: '2026-07-01',
  paymentInstallments: [],
  quotations: [quotation],
};

function renderWithStatus(status: QuotationStatus) {
  vi.mocked(useProject).mockReturnValue({
    data: { ...project, quotations: [{ ...quotation, status }] },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useProject>);

  return render(
    <MemoryRouter initialEntries={['/client/dashboard/quotations/proj-1/q-1']}>
      <Routes>
        <Route
          path="/client/dashboard/quotations/:projectId/:quotationId"
          element={<QuotationDetailPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.mocked(useProjectPayments).mockReturnValue({
    data: [],
  } as unknown as ReturnType<typeof useProjectPayments>);
  vi.mocked(usePackage).mockReturnValue({
    data: undefined,
  } as unknown as ReturnType<typeof usePackage>);
  vi.mocked(useAcceptQuotation).mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
    error: null,
  } as unknown as ReturnType<typeof useAcceptQuotation>);
  vi.mocked(useRejectQuotation).mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
    error: null,
  } as unknown as ReturnType<typeof useRejectQuotation>);
});

describe('QuotationDetailPage', () => {
  it('shows the breakdown, projected schedule, and actions for a sent quotation', () => {
    renderWithStatus('sent');

    expect(screen.getByText('Extra Revision')).toBeInTheDocument();
    expect(screen.getByText('Payment Schedule')).toBeInTheDocument();
    expect(screen.getAllByText('On acceptance').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Accept Quotation' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Request Changes' })).toBeInTheDocument();
  });

  it('shows a prepared-in-progress notice for a draft quotation', () => {
    renderWithStatus('draft');

    expect(screen.getByText(/being prepared/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accept Quotation' })).not.toBeInTheDocument();
  });

  it('shows the receipt for an accepted quotation', () => {
    renderWithStatus('accepted');

    expect(screen.getByText('Payment Receipt')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accept Quotation' })).not.toBeInTheDocument();
  });

  it('shows a changes-requested notice for a rejected quotation', () => {
    renderWithStatus('rejected');

    expect(screen.getByText(/requested changes/i)).toBeInTheDocument();
  });

  it('shows the error state when the quotation is not on the project', () => {
    vi.mocked(useProject).mockReturnValue({
      data: { ...project, quotations: [] },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useProject>);

    render(
      <MemoryRouter initialEntries={['/client/dashboard/quotations/proj-1/q-1']}>
        <Routes>
          <Route
            path="/client/dashboard/quotations/:projectId/:quotationId"
            element={<QuotationDetailPage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.queryByText('QUO-0001')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm --prefix frontend test -- QuotationDetailPage`
Expected: FAIL — cannot resolve `./QuotationDetailPage`.

- [ ] **Step 3: Write the page**

Create `frontend/src/modules/quotations/pages/QuotationDetailPage.tsx`:

```tsx
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import { Alert } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { LoadingSpinner } from '@/shared/components/common/LoadingSpinner';
import { formatPHP, toNumber } from '@/shared/utils/currency';
import { formatTimelineRange } from '@/shared/utils/timeline';
import type { ApiError } from '@/shared/api/apiClient';
import { useProject } from '@/modules/projects/api/projects.queries';
import { useProjectPayments } from '@/modules/payments/api/payments.queries';
import { PaymentReceiptCard } from '@/modules/payments/components/PaymentReceiptCard';
import { PaymentScheduleCard } from '@/modules/payments/components/PaymentScheduleCard';
import { computeProjectedInstallments } from '@/modules/payments/utils/projectedSchedule';
import { useAcceptQuotation, useRejectQuotation } from '../api/quotations.queries';
import { QuotationSummaryCard } from '../components/QuotationSummaryCard';

/**
 * A single quotation, read out of its parent project (the API has no
 * `GET /quotations/:id` — see `quotations.api.ts`). This page owns the
 * accept/reject decision: it is the only call site for those mutations, so
 * the client reviews cost and payment commitment in one place rather than
 * splitting the decision across the project's Invoices tab.
 *
 * Before acceptance the installment schedule is a frontend projection —
 * the server doesn't create real installment rows until accept succeeds.
 */
export function QuotationDetailPage() {
  const { projectId, quotationId } = useParams<{ projectId: string; quotationId: string }>();
  const { data: project, isLoading, isError, refetch } = useProject(projectId ?? '');
  const { data: payments } = useProjectPayments(projectId ?? '');

  const acceptQuotation = useAcceptQuotation(projectId ?? '');
  const rejectQuotation = useRejectQuotation(projectId ?? '');

  if (isLoading) {
    return <LoadingSpinner label="Loading quotation..." />;
  }

  const quotation = project?.quotations?.find((row) => row.id === quotationId);

  if (isError || !project || !quotation) {
    return (
      <ErrorState
        description="We couldn't load this quotation."
        onRetry={() => refetch()}
      />
    );
  }

  const mutationError = (acceptQuotation.error ?? rejectQuotation.error) as ApiError | null;
  const projectedInstallments = computeProjectedInstallments(quotation.total_amount);
  const isPending = acceptQuotation.isPending || rejectQuotation.isPending;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{quotation.quotation_number}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{project.title}</p>
        </div>
        <Link
          to="/client/dashboard/quotations"
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          All quotations
        </Link>
      </div>

      {mutationError && (
        <Alert variant="danger" title="Something went wrong" description={mutationError.message} />
      )}

      {quotation.status === 'draft' && (
        <Alert
          variant="info"
          title="Your quotation is being prepared"
          description="We're reviewing your request. You'll be able to review and accept your quotation once it's ready."
        />
      )}

      {quotation.status === 'rejected' && (
        <Alert
          variant="warning"
          title="You requested changes"
          description="Our team will follow up with a revised quotation."
        />
      )}

      {quotation.status === 'expired' && (
        <Alert
          variant="warning"
          title="This quotation has expired"
          description="Get in touch with our team and we'll prepare an updated one for you."
        />
      )}

      {quotation.status === 'sent' && (
        <>
          <QuotationSummaryCard
            quotationNumber={quotation.quotation_number}
            packageLabel={project.title}
            basePrice={toNumber(quotation.base_price)}
            addonLines={(quotation.addons ?? []).map((addon) => ({
              label: addon.name,
              amount: addon.priceAtTime,
            }))}
            total={toNumber(quotation.total_amount)}
            timelineLabel={formatTimelineRange(
              quotation.estimated_timeline_min_days,
              quotation.estimated_timeline_max_days,
            )}
            footer={
              <>
                <Button
                  variant="outline"
                  onClick={() => rejectQuotation.mutate(quotation.id)}
                  disabled={isPending}
                >
                  Request Changes
                </Button>
                <Button onClick={() => acceptQuotation.mutate(quotation.id)} disabled={isPending}>
                  {acceptQuotation.isPending ? 'Accepting...' : 'Accept Quotation'}
                </Button>
              </>
            }
          />

          <PaymentScheduleCard projected={projectedInstallments} />
        </>
      )}

      {quotation.status === 'accepted' && (
        <>
          <Alert
            variant="success"
            title="Quotation accepted"
            description={`You accepted ${quotation.quotation_number} for ${formatPHP(quotation.total_amount)}.`}
          />

          <PaymentReceiptCard project={project} quotation={quotation} payment={payments?.[0]} />

          <Link
            to={`/client/dashboard/projects/${project.id}`}
            className={buttonVariants({ variant: 'outline' })}
          >
            Go to project to submit a payment
          </Link>
        </>
      )}
    </div>
  );
}

export default QuotationDetailPage;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm --prefix frontend test -- QuotationDetailPage`
Expected: PASS, 5 tests.

- [ ] **Step 5: Register the route**

In `frontend/src/app/router/index.tsx`, directly after the `quotations` entry added in Task 5:

```tsx
              {
                path: 'quotations/:projectId/:quotationId',
                lazy: lazyPage(() => import('@/modules/quotations/pages/QuotationDetailPage')),
              },
```

- [ ] **Step 6: Verify**

Run: `npm --prefix frontend run build`
Expected: success.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/modules/quotations/pages/QuotationDetailPage.tsx frontend/src/modules/quotations/pages/QuotationDetailPage.test.tsx frontend/src/app/router/index.tsx
git commit -m "feat: add client quotation detail page with projected schedule"
```

---

### Task 7: Narrow the Invoices tab to payments

**Files:**
- Modify: `frontend/src/modules/projects/components/InvoicesTab.tsx`
- Test: `frontend/src/modules/projects/components/InvoicesTab.test.tsx` (create)

**Interfaces:**
- Consumes: the quotation detail route from Task 6.
- Produces: nothing consumed by later tasks — this is the final task.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/modules/projects/components/InvoicesTab.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../api/projects.queries', () => ({ useProject: vi.fn() }));
vi.mock('@/modules/payments/api/payments.queries', () => ({ useProjectPayments: vi.fn() }));

import { useProject } from '../api/projects.queries';
import { useProjectPayments } from '@/modules/payments/api/payments.queries';
import { InvoicesTab } from './InvoicesTab';
import type { Project } from '@/shared/types/project.types';
import type { Quotation } from '@/shared/types/quotation.types';

const quotation: Quotation = {
  id: 'q-1',
  quotation_number: 'QUO-0001',
  project_id: 'proj-1',
  package_id: 'pkg-1',
  base_price: '45000.00',
  estimated_timeline_min_days: 14,
  estimated_timeline_max_days: 21,
  discount_amount: '0.00',
  total_amount: '50000.00',
  status: 'sent',
  created_at: '2026-07-01',
  sent_at: '2026-07-01',
  responded_at: null,
  addons: [],
};

const project: Project = {
  id: 'proj-1',
  client_id: 1,
  package_id: 'pkg-1',
  title: 'Business Package',
  request_details: null,
  status_code: 'quoted',
  decline_reason: null,
  timeline_estimate_min_days: null,
  timeline_estimate_max_days: null,
  start_date: null,
  end_date: null,
  completion_date: null,
  created_at: '2026-07-01',
  updated_at: '2026-07-01',
  paymentInstallments: [],
  quotations: [quotation],
};

beforeEach(() => {
  vi.mocked(useProjectPayments).mockReturnValue({
    data: [],
  } as unknown as ReturnType<typeof useProjectPayments>);
});

function renderTab(overrides: Partial<Project> = {}) {
  vi.mocked(useProject).mockReturnValue({
    data: { ...project, ...overrides },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useProject>);

  return render(
    <MemoryRouter>
      <InvoicesTab projectId="proj-1" />
    </MemoryRouter>,
  );
}

describe('InvoicesTab', () => {
  it('no longer renders the payment receipt or accept/reject actions', () => {
    renderTab({ quotations: [{ ...quotation, status: 'accepted' }] });

    expect(screen.queryByText('Payment Receipt')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accept Quotation' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Request Changes' })).not.toBeInTheDocument();
  });

  it('links a sent quotation out to the quotations section', () => {
    renderTab();

    expect(screen.getByRole('link', { name: /review your quotation/i })).toHaveAttribute(
      'href',
      '/client/dashboard/quotations/proj-1/q-1',
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm --prefix frontend test -- InvoicesTab`
Expected: FAIL — the receipt and accept/reject buttons still render; the link does not exist.

- [ ] **Step 3: Edit the component**

In `frontend/src/modules/projects/components/InvoicesTab.tsx`:

Remove these imports: `Button` (line 2), `formatTimelineRange` (line 7), `ApiError` (line 8), `useAcceptQuotation` / `useRejectQuotation` (lines 11–14), `QuotationSummaryCard` (line 15), `PaymentReceiptCard` (line 18), and `toNumber` from the currency import on line 6 (keep `formatPHP`). Add `Link` from `react-router-dom` and `buttonVariants` from `@/components/ui/button`.

Delete the two mutation hooks (lines 38–39) and the `quotationError` const (line 55), plus the `quotationError` Alert block (lines 102–104).

Replace the whole `latestQuotation.status === 'sent'` block (lines 114–146) with:

```tsx
      {latestQuotation && latestQuotation.status === 'sent' && (
        <div className="flex flex-col items-start gap-3">
          <Alert
            className="w-full"
            variant="info"
            title="You have a quotation to review"
            description="Your cost breakdown and payment schedule are in the Quotations section."
          />
          <Link
            to={`/client/dashboard/quotations/${project.id}/${latestQuotation.id}`}
            className={buttonVariants({ size: 'sm' })}
          >
            Review your quotation
          </Link>
        </div>
      )}
```

`Alert` accepts only `variant`, `title`, `description`, and standard `div`
props (`frontend/src/components/ui/alert.tsx:35-40`) — there is no `action`
slot, which is why the link is a sibling rather than a prop.

Delete the `PaymentReceiptCard` line (line 185) entirely.

Update the file's doc comment (lines 24–33) to state that the tab now owns payment submission and tracking only, and that quotation review, the cost breakdown, and the payment schedule live in the Quotations section.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm --prefix frontend test -- InvoicesTab`
Expected: PASS, 2 tests.

- [ ] **Step 5: Full verification**

Run each and confirm all three pass:

```bash
npm --prefix frontend run lint
npm --prefix frontend test
npm --prefix frontend run build
```

- [ ] **Step 6: Manual QA**

Run `npm run dev`. As a client:

1. Sidebar shows **Quotations**, enabled, and it loads the list.
2. A `sent` quotation opens to a breakdown plus a projected schedule whose rows sum to the total and whose due column reads "On acceptance", "1 week after", …
3. Accepting it moves the page to receipt view with real dates, and the project's Invoices tab offers the payment form.
4. The Invoices tab shows no receipt card and no accept/reject buttons.
5. Admin and staff dashboards are unchanged — `Quotations` still disabled in their sidebars, and the admin project detail page still shows the quotation builder and payment schedule.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/modules/projects/components/InvoicesTab.tsx frontend/src/modules/projects/components/InvoicesTab.test.tsx
git commit -m "refactor: narrow project Invoices tab to payment submission"
```

---

## Self-Review

**Spec coverage:** Backend endpoint → Task 1. Types/api/query layer → Task 2. Projected schedule utility → Task 3. `PaymentScheduleCard` projected mode → Task 4. List page, routes, nav → Task 5. Detail page and its four status branches → Task 6. Invoices tab removals → Task 7. Testing section → covered per-task plus the full run in Task 7 Step 5. Security notes → Task 1 Steps 1 and 4, verified in Step 6.

**Type consistency:** `QuotationListItem` (Task 2) is consumed by name in Task 5. `ProjectedInstallment` / `computeProjectedInstallments` / `formatProjectedDueLabel` (Task 3) are consumed by Tasks 4 and 6 under those exact names. `QUOTATION_STATUS_LABELS` / `QUOTATION_STATUS_BADGE_VARIANT` (Task 5) are used in Task 5's page. `queryKeys.quotations.list()` is defined and invalidated in Task 2.

**Assumptions verified against the codebase before finalizing:** `Alert` exposes no `action` prop (`components/ui/alert.tsx:35-40`), so Task 7 renders the link as a sibling. `PaymentInstallment` carries `id`, `project_id`, `quotation_id`, `sequence`, `percentage`, `amount`, `due_date`, `status`, `created_at` — matching the fixtures in Task 4. `Project.quotations` is optional and only populated by `GET /projects/:id`, which is why Task 6 fetches the project rather than reading from the list query.
