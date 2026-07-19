# Payment Receipt Card — Design

Date: 2026-07-19

## Problem

The Invoices tab's "Payment" card (`InvoicesTab.tsx`) currently shows only amount, reference number, a status badge, and the client's uploaded proof-of-payment image (`PaymentProofPreview`). It doesn't read like a receipt — no branding, no price breakdown, no visibility into what the client actually bought (package pages) or the full installment schedule alongside the payment.

Client wants an e-receipt style view: company logo, itemized breakdown (base price + add-ons + total), the pages included in the package, and the payment schedule — all in one place. The uploaded proof image and the standalone "accepted" checkmark icon should be dropped from this view.

## Scope

Replace the existing "Payment" card in `InvoicesTab.tsx` with a new `PaymentReceiptCard` component. `PaymentScheduleCard` continues to exist as its own component (reused, not duplicated) but renders *inside* the receipt instead of as a separate card above it.

Out of scope: PDF export/printing, emailing the receipt, changes to the admin/staff payment queue views, changes to payment submission flow (`PaymentForm`).

## Component: `PaymentReceiptCard`

Location: `frontend/src/modules/payments/components/PaymentReceiptCard.tsx`

Props:
```ts
interface PaymentReceiptCardProps {
  project: Project;
  quotation: Quotation | undefined; // latestQuotation, status === 'accepted'
  payment: Payment | undefined; // latestPayment
}
```

Sections, top to bottom:

1. **Header** — CodeHaus logo (`@/assets/codehaus-logo.svg`, same asset as `Navbar.tsx`) + "Payment Receipt" title + `quotation.quotation_number`.
2. **Breakdown** — reuses the same data shape as `QuotationSummaryCard`: base price line, one line per `quotation.addons[]` (name + price), total. Rendered as a simple two-column `dl`/table, not the full `QuotationSummaryCard` (that component carries accept/reject actions this view doesn't need).
3. **Pages availed** — fetched via `usePackage(project.package_id ?? undefined)`; renders `pkg.pages[]` names as a simple list. Section is omitted entirely when `project.package_id` is `null` (custom project) — confirmed with client, no fallback text.
4. **Payment schedule** — renders `<PaymentScheduleCard installments={project.paymentInstallments} />` unchanged, nested inside this card's content instead of as a sibling card in `InvoicesTab`.
5. **Payment status** — status badge, amount, reference number, payment method. The existing `PAYMENT_STATUS_BADGE`/`PAYMENT_STATUS_LABEL` maps move from `InvoicesTab.tsx` into `PaymentReceiptCard.tsx` (their only consumer once this change lands). No proof-of-payment image, no `PaymentProofPreview` usage.

Renders nothing if there's no accepted quotation yet (mirrors current guard in `InvoicesTab`).

## Changes to `InvoicesTab.tsx`

- Remove the standalone `<PaymentScheduleCard>` render (now nested inside the receipt) and the `latestPayment` Card block (lines ~207-250 in current file).
- Remove the `CheckCircle2` icon from the fully-paid/no-payment-row block (lines ~252-259) — keep the "Your project has been accepted!" text, drop the icon.
- Render `<PaymentReceiptCard project={project} quotation={latestQuotation} payment={latestPayment} />` in their place.
- Drop the now-unused `PaymentProofPreview` import once nothing else in this file uses it (confirm no other caller before deleting the component file itself — out of scope to delete the component, just stop using it here).

## Data

No backend changes. All data already available client-side:
- Breakdown: `latestQuotation` (already fetched via `useProject`).
- Pages: `usePackage(project.package_id)` — new query call, existing hook (`frontend/src/modules/packages/api/packages.queries.ts`), already handles `enabled: Boolean(id)` gating so passing `undefined`/`null` package_id is safe.
- Schedule: `project.paymentInstallments` (already fetched via `useProject`).
- Payment: `latestPayment` (already fetched via `useProjectPayments`).

## Styling

Follow `frontend/docs/design-system.md` conventions already used in this module: `Card`/`CardHeader`/`CardTitle`/`CardContent` from `@/components/ui/card`, `Badge` for status (icon + label, never color alone), `formatPHP`/`toNumber` from `@/shared/utils/currency`, responsive table/list pattern already implemented in `PaymentScheduleCard` (table ≥ `sm`, stacked list below). No new design tokens needed.

## Testing

Manual QA (per CLAUDE.md — no backend test script, frontend has Vitest but this is presentation wiring over existing hooks). Verify:
- Receipt renders correctly for a package project with an accepted quotation and a submitted payment (all sections present).
- Pages section is absent for a custom project (`package_id === null`).
- Receipt renders correctly with no `latestPayment` yet (schedule shown, payment status section omitted/empty-stated).
- No proof-of-payment image or checkmark icon anywhere in the tab.
- Responsive: mobile stacked layout matches `PaymentScheduleCard`'s existing breakpoint behavior.
