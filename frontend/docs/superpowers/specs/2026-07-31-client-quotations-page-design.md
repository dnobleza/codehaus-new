# Client Quotations Page — Design

**Date:** 2026-07-31
**Scope:** Client role only. Staff and admin surfaces are explicitly out of scope.

## Problem

A client's quotation breakdown and payment schedule are currently buried inside the
project detail page's **Invoices** tab (`PaymentReceiptCard`, which embeds
`PaymentScheduleCard`). A client who wants to answer "what am I paying in total, and
when?" has to open a project, find the Invoices tab, and read a card that only renders
*after* they have already accepted the quotation. Before acceptance they see a total but
no payment breakdown at all.

## Goal

Give the client a first-class **Quotations** section, reachable from the sidebar, where
every quotation they have ever received is listed and each one opens to a clear view of
total cost and the installment breakdown — including a projected schedule *before* they
accept, so the payment commitment is visible at decision time rather than after.

## Non-goals

- No admin or staff Quotations page. Admin quotation authoring stays exactly where it is
  today: the inline `AdminQuotationBuilder` on `AdminProjectDetailPage`.
- No change to how quotations are created, priced, or sent.
- No change to the installment schedule's shape, percentages, or generation timing.

## Existing constraints discovered

These shaped the design and are load-bearing:

1. **No quotation list endpoint.** `GET /projects` returns bare `projects` rows with no
   nested quotations (`projects.repository.js#listByClient`). Quotations are only
   readable nested inside `GET /projects/:id`.
2. **No standalone quotation endpoint.** There is no `GET /quotations/:id`.
3. **Installments do not exist before acceptance.** `generateInstallmentSchedule` runs
   inside the accept transaction (`quotations.service.js`). A `sent` quotation has zero
   `payment_installments` rows.
4. **Due dates anchor to acceptance time**, not to project start date and not to the time
   the quotation was sent. A pre-acceptance preview therefore cannot know real calendar
   dates.
5. **The schedule is fixed**: `[50, 20, 10, 10, 10]` percent, spaced 7 days apart.
   Installments 1–4 round to the cent; installment 5 absorbs the remainder so the rows
   sum to exactly the total.

## Architecture

### Backend — one new endpoint

`GET /quotations` — authenticated, `requireRole('client')`. Returns every quotation
belonging to the caller's own projects.

- **`quotations.repository.js`** — new `listByClient(clientId, db = pool)`. A single
  parameterized join:

  ```sql
  SELECT q.id, q.quotation_number, q.status, q.total_amount, q.created_at,
         q.project_id, p.title AS project_title
  FROM quotations q
  JOIN projects p ON p.id = q.project_id
  WHERE p.client_id = $1
  ORDER BY q.created_at DESC
  ```

  Ownership is enforced by the join predicate, not by a post-filter. Addon line items are
  deliberately not joined — the list view does not display them, and the detail view gets
  them from the project endpoint.

- **`quotations.service.js`** — `listQuotationsForClient(clientId)`, a thin pass-through
  to the repository. No business rules apply to a read of one's own rows.

- **`quotations.controller.js`** — new `list` handler, thin, reads `req.user.id`.

- **`backend/src/routes/quotations.route.js`** — new file, `router.use(verifyAccessToken)`
  then `router.get('/', requireRole('client'), quotationsController.list)`, following
  `projects.route.js`'s per-route role style. Mounted at `/quotations` in `app.js`.

No detail endpoint is added. `GET /projects/:id` already nests quotations with their addon
breakdown, which is exactly what the detail page needs.

### Frontend — routes

| Path | Page |
|---|---|
| `/client/dashboard/quotations` | `QuotationsListPage` |
| `/client/dashboard/quotations/:projectId/:quotationId` | `QuotationDetailPage` |

Carrying `projectId` in the detail URL is what allows the detail page to reuse
`useProject(projectId)` and select the quotation out of the nested array by
`quotationId` — avoiding constraint 2 entirely. Both routes are lazy-loaded, matching the
existing client route entries in `app/router/index.tsx`.

`CLIENT_NAV_ITEMS` in `shared/layouts/dashboardNav.config.ts`: the `Quotations` entry
gains `path: '/client/dashboard/quotations'` and drops `disabled: true`. `STAFF_NAV_ITEMS`
and `ADMIN_NAV_ITEMS` are not touched.

### Frontend — new files

```
modules/quotations/pages/QuotationsListPage.tsx
modules/quotations/pages/QuotationDetailPage.tsx
modules/payments/utils/projectedSchedule.ts
```

### Frontend — data layer

- `quotations.api.ts` — add `listMine(): Promise<QuotationListItem[]>` calling
  `GET /quotations`. The existing module comment stating quotations have no standalone
  read endpoint is updated to describe the new list surface accurately.
- `quotations.queries.ts` — add `useMyQuotations()`.
- `shared/types/quotation.types.ts` — add `QuotationListItem` (the flat list row:
  `id`, `quotation_number`, `status`, `total_amount`, `created_at`, `project_id`,
  `project_title`). Distinct from the existing nested `Quotation` type, which carries
  addon line items the list row does not have.

## Component behavior

### QuotationsListPage

Renders the client's quotations newest-first: quotation number, project title, status
badge, total, and date received, each row linking to its detail page. Follows the
responsive table rule in `design-system.md` §4 — table on `sm` and up, stacked cards
below — the same pattern `PaymentScheduleCard` already implements. Empty state when the
client has no quotations yet.

### QuotationDetailPage

Fetches the parent project, selects the quotation by `quotationId`, and branches on
status:

| Status | Renders |
|---|---|
| `draft` | Info alert: the quotation is still being prepared |
| `sent` | `QuotationSummaryCard` + projected schedule + Accept / Request Changes |
| `accepted` | `PaymentReceiptCard` + a link to the project's Invoices tab to submit payment |
| `rejected` | Warning alert: changes were requested, a revised quotation will follow |

If the `quotationId` is not present on the fetched project, the page renders the shared
`ErrorState` — this covers both a mistyped URL and a quotation belonging to someone else's
project (the project fetch itself 403s in that case).

### Projected schedule

`computeProjectedInstallments(total)` in `modules/payments/utils/projectedSchedule.ts`
mirrors the backend generator exactly: the same `[50, 20, 10, 10, 10]` constant, the same
per-installment rounding, and the same remainder-absorption on installment 5 so the rows
sum to the total to the cent. It returns `{ sequence, percentage, amount }` — no dates, no
status, no ids.

Due dates render as **relative labels** — "On acceptance", "1 week after", "2 weeks
after", and so on — because of constraint 4. Showing absolute calendar dates before
acceptance would display dates the backend will not honor.

`PaymentScheduleCard` gains a discriminated prop union:

- `{ installments: PaymentInstallment[] }` — today's behavior, unchanged: real due dates,
  Paid/Pending/Overdue badges, the "N of M paid" footer.
- `{ projected: ProjectedInstallment[] }` — relative due labels, no status badges, and a
  footer stating the total rather than a paid count. Copy makes clear the schedule begins
  once the quotation is accepted.

The card returns `null` for a projected schedule when the total is 0, consistent with the
known ₱0-quote gap recorded in `CLAUDE.md` — this design does not fix that gap, it avoids
rendering a misleading all-zero schedule.

## What is removed from the Invoices tab

In `modules/projects/components/InvoicesTab.tsx`:

- `PaymentReceiptCard` (and therefore the payment schedule) is removed. This is the
  "move" the feature is named for.
- The Accept / Request Changes buttons are removed. Those mutations now have exactly one
  call site — the quotation detail page. Two call sites for the same state transition
  would be a drift risk with no user benefit.
- The `QuotationSummaryCard` block shown for a `sent` quotation is replaced by a short
  alert — "You have a quotation to review" — linking to the quotation detail page.

The tab retains: the project status stepper, the cancelled/declined and
custom-quotation-pending alerts, the quotation-status alerts, the payment status alerts,
and `PaymentForm`. Its purpose narrows cleanly to *submitting and tracking payments*,
while the Quotations section owns *reviewing and accepting quotations*.

`useAcceptQuotation` / `useRejectQuotation` remain in `quotations.queries.ts` unchanged;
only the call site moves.

## Testing

Vitest, following the existing `PaymentReceiptCard.test.tsx` pattern.

- `projectedSchedule.ts`: rows sum exactly to the total; odd-cent totals (e.g. ₱99,999.99)
  land the remainder on installment 5; a 0 total returns an empty result; percentages
  match `[50, 20, 10, 10, 10]`.
- `PaymentScheduleCard`: projected mode renders relative labels and no status badges;
  actual mode is unchanged.
- `QuotationDetailPage`: each of the four statuses renders its expected surface; a missing
  quotation id renders the error state.
- `InvoicesTab`: no longer renders the receipt card or the accept/reject buttons.

Backend has no test script (`CLAUDE.md`), so `GET /quotations` is verified by manual QA:
a client sees only their own quotations, and a staff or admin token is rejected with 403.

Before opening a PR: `npm --prefix frontend run lint`, `npm --prefix frontend test`,
`npm --prefix frontend run build`.

## Security notes

- The list query scopes by `p.client_id = $1` from the verified JWT subject, inside the
  SQL predicate. No client-supplied identifier participates in the scoping.
- The query is fully parameterized.
- `requireRole('client')` gates the route, matching the existing client project routes.
- The detail page relies on `GET /projects/:id`'s existing ownership check; no new
  authorization surface is introduced on the read path.
