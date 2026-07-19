# Payment Receipt Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Invoices tab's plain "Payment" card with an e-receipt style `PaymentReceiptCard` showing the CodeHaus logo, an itemized price breakdown, the package's included pages, and the full installment schedule — with no uploaded proof-of-payment image and no standalone "verified" checkmark icon.

**Architecture:** New presentational component `PaymentReceiptCard` in `frontend/src/modules/payments/components/`, composing existing pieces (`PaymentScheduleCard`, `formatPHP`/`toNumber`, `Badge`, `Card`) plus one new data dependency (`usePackage`) to list the package's pages. `InvoicesTab.tsx` swaps its old Payment card + standalone schedule + accepted-icon block for this one component (plus the 3 relocated status Alerts).

**Tech Stack:** React 19 + TypeScript, TanStack Query (`usePackage`), Tailwind CSS v4, existing `@/components/ui/*` (Card, Badge), Vitest + React Testing Library.

## Global Constraints

- Follow `frontend/docs/design-system.md`: status always shown as icon+label Badge, never color alone; ₱ amounts via `formatPHP`/`toNumber` (`frontend/src/shared/utils/currency.ts`), never hand-rolled formatting.
- No backend changes — all data is already fetched client-side via existing hooks (`useProject`, `useProjectPayments`, `usePackage`).
- No proof-of-payment image, no standalone "verified" checkmark icon anywhere in the Invoices tab after this change.
- Spec: `frontend/docs/superpowers/specs/2026-07-19-payment-receipt-card-design.md`.

---

### Task 1: `PaymentReceiptCard` component + test

**Files:**
- Create: `frontend/src/modules/payments/components/PaymentReceiptCard.tsx`
- Create: `frontend/src/modules/payments/components/PaymentReceiptCard.test.tsx`

**Interfaces:**
- Consumes: `usePackage(id: string | undefined)` from `frontend/src/modules/packages/api/packages.queries.ts` (returns `{ data: Package | undefined, ... }`, already handles `enabled: Boolean(id)`); `PaymentScheduleCard` from `./PaymentScheduleCard` (props: `{ installments: PaymentInstallment[] | undefined }`); `formatPHP`, `toNumber` from `@/shared/utils/currency`; `Project` from `@/shared/types/project.types`; `Quotation` from `@/shared/types/quotation.types`; `Payment` from `@/shared/types/payment.types`; `Badge`/`BadgeProps` from `@/components/ui/badge`; `Card`/`CardContent`/`CardHeader`/`CardTitle` from `@/components/ui/card`; logo asset `@/assets/codehaus-logo.svg` (same import `Navbar.tsx` uses).
- Produces: `export function PaymentReceiptCard(props: { project: Project; quotation: Quotation | undefined; payment: Payment | undefined }): JSX.Element | null` — consumed by Task 2.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/modules/payments/components/PaymentReceiptCard.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { PaymentReceiptCard } from './PaymentReceiptCard';
import type { Project } from '@/shared/types/project.types';
import type { Quotation } from '@/shared/types/quotation.types';
import type { Payment } from '@/shared/types/payment.types';

vi.mock('@/modules/packages/api/packages.queries', () => ({
  usePackage: vi.fn(),
}));

import { usePackage } from '@/modules/packages/api/packages.queries';

const baseProject: Project = {
  id: 'proj-1',
  client_id: 1,
  package_id: 'pkg-1',
  title: 'Business Package',
  request_details: null,
  status_code: 'accepted',
  decline_reason: null,
  timeline_estimate_min_days: null,
  timeline_estimate_max_days: null,
  start_date: null,
  end_date: null,
  completion_date: null,
  created_at: '2026-07-01',
  updated_at: '2026-07-01',
  paymentInstallments: [],
};

const baseQuotation: Quotation = {
  id: 'q-1',
  quotation_number: 'QUO-0001',
  project_id: 'proj-1',
  package_id: 'pkg-1',
  base_price: '45000.00',
  estimated_timeline_min_days: 14,
  estimated_timeline_max_days: 21,
  discount_amount: '0.00',
  total_amount: '50000.00',
  status: 'accepted',
  created_at: '2026-07-01',
  sent_at: '2026-07-01',
  responded_at: '2026-07-01',
  addons: [{ addonId: 'a1', name: 'Extra Revision', category: 'design', priceAtTime: 5000 }],
};

const basePayment: Payment = {
  id: 'p-1',
  project_id: 'proj-1',
  payment_method: 'gcash',
  amount: '25000.00',
  reference_number: 'REF123',
  proof_of_payment_url: '/projects/proj-1/payments/p-1/proof',
  status: 'verified',
  verified_by: 1,
  verified_at: '2026-07-02',
  created_at: '2026-07-01',
};

describe('PaymentReceiptCard', () => {
  it('renders nothing when the quotation is not accepted', () => {
    vi.mocked(usePackage).mockReturnValue({ data: undefined } as ReturnType<typeof usePackage>);

    const { container } = render(
      <PaymentReceiptCard
        project={baseProject}
        quotation={{ ...baseQuotation, status: 'sent' }}
        payment={undefined}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders breakdown, pages, schedule, and payment status with no proof image', () => {
    vi.mocked(usePackage).mockReturnValue({
      data: {
        id: 'pkg-1',
        name: 'Business Package',
        slug: 'business',
        description: null,
        base_price: '45000.00',
        estimated_timeline_min_days: 14,
        estimated_timeline_max_days: 21,
        display_order: 0,
        is_active: true,
        thumbnail_url: null,
        banner_url: null,
        is_custom: false,
        created_by: null,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        pages: [
          { id: 'pg1', name: 'Home', displayOrder: 0 },
          { id: 'pg2', name: 'About', displayOrder: 1 },
        ],
        features: [],
      },
    } as ReturnType<typeof usePackage>);

    render(
      <PaymentReceiptCard project={baseProject} quotation={baseQuotation} payment={basePayment} />,
    );

    expect(screen.getByText('Payment Receipt')).toBeInTheDocument();
    expect(screen.getByText('QUO-0001')).toBeInTheDocument();
    expect(screen.getByText('Extra Revision')).toBeInTheDocument();
    expect(screen.getByText('Home, About')).toBeInTheDocument();
    expect(screen.getByText('REF123')).toBeInTheDocument();
    expect(screen.queryByAltText('Uploaded proof of payment')).not.toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /uploaded proof/i })).not.toBeInTheDocument();
  });

  it('hides the pages section for custom projects (no package_id)', () => {
    vi.mocked(usePackage).mockReturnValue({ data: undefined } as ReturnType<typeof usePackage>);

    render(
      <PaymentReceiptCard
        project={{ ...baseProject, package_id: null }}
        quotation={baseQuotation}
        payment={undefined}
      />,
    );

    expect(screen.queryByText('Pages Included')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix frontend test -- PaymentReceiptCard`
Expected: FAIL — `Cannot find module './PaymentReceiptCard'` (component doesn't exist yet).

- [ ] **Step 3: Write the component**

Create `frontend/src/modules/payments/components/PaymentReceiptCard.tsx`:

```tsx
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPHP } from '@/shared/utils/currency';
import type { Payment, PaymentStatus, PaymentMethod } from '@/shared/types/payment.types';
import type { Project } from '@/shared/types/project.types';
import type { Quotation } from '@/shared/types/quotation.types';
import { usePackage } from '@/modules/packages/api/packages.queries';
import { PaymentScheduleCard } from './PaymentScheduleCard';
import codehausLogo from '@/assets/codehaus-logo.svg';

const PAYMENT_STATUS_BADGE: Record<PaymentStatus, BadgeProps['variant']> = {
  pending: 'neutral',
  verification: 'warning',
  verified: 'success',
  rejected: 'danger',
};

const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: 'Pending',
  verification: 'Under Verification',
  verified: 'Verified',
  rejected: 'Rejected — please resubmit',
};

const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  bank_transfer: 'Bank Transfer',
  gcash: 'GCash',
  maya: 'Maya',
};

interface PaymentReceiptCardProps {
  project: Project;
  quotation: Quotation | undefined;
  payment: Payment | undefined;
}

/**
 * E-receipt style summary of an accepted quotation: branded header,
 * itemized price breakdown, the package's included pages, the full
 * installment schedule, and the client's latest payment status. Shows no
 * uploaded proof-of-payment image and no standalone "verified" icon —
 * status is conveyed by the Badge alone, per design-system.md's
 * icon+label rule. Renders nothing before a quotation has been accepted.
 */
export function PaymentReceiptCard({ project, quotation, payment }: PaymentReceiptCardProps) {
  const { data: pkg } = usePackage(project.package_id ?? undefined);

  if (!quotation || quotation.status !== 'accepted') return null;

  const addonLines = quotation.addons ?? [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={codehausLogo} alt="CodeHaus" className="h-8 w-auto" />
            <CardTitle>Payment Receipt</CardTitle>
          </div>
          <span className="text-sm font-medium text-muted-foreground">
            {quotation.quotation_number}
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-semibold text-muted-foreground">Breakdown</p>
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground">Base Package: {project.title}</span>
            <span className="font-medium text-foreground">{formatPHP(quotation.base_price)}</span>
          </div>
          {addonLines.map((line) => (
            <div key={line.addonId} className="flex items-center justify-between text-sm">
              <span className="text-foreground">{line.name}</span>
              <span className="font-medium text-foreground">{formatPHP(line.priceAtTime)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-border pt-2">
            <span className="text-base font-semibold text-foreground">Total</span>
            <span className="text-xl font-bold text-foreground">
              {formatPHP(quotation.total_amount)}
            </span>
          </div>
        </div>

        {pkg && pkg.pages.length > 0 && (
          <div className="flex flex-col gap-1.5 border-t border-border pt-4">
            <p className="text-xs font-semibold text-muted-foreground">Pages Included</p>
            <p className="text-sm text-foreground">
              {pkg.pages.map((page) => page.name).join(', ')}
            </p>
          </div>
        )}

        <div className="border-t border-border pt-4">
          <PaymentScheduleCard installments={project.paymentInstallments} />
        </div>

        {payment && (
          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground">Latest Payment</p>
              <Badge variant={PAYMENT_STATUS_BADGE[payment.status]}>
                {PAYMENT_STATUS_LABEL[payment.status]}
              </Badge>
            </div>
            <dl className="grid grid-cols-2 gap-y-1 text-sm">
              <dt className="text-muted-foreground">Amount</dt>
              <dd className="text-right font-medium text-foreground">
                {formatPHP(payment.amount)}
              </dd>
              <dt className="text-muted-foreground">Method</dt>
              <dd className="text-right font-medium text-foreground">
                {PAYMENT_METHOD_LABEL[payment.payment_method]}
              </dd>
              <dt className="text-muted-foreground">Reference number</dt>
              <dd className="text-right font-medium text-foreground">
                {payment.reference_number ?? '—'}
              </dd>
            </dl>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix frontend test -- PaymentReceiptCard`
Expected: PASS — all 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/modules/payments/components/PaymentReceiptCard.tsx frontend/src/modules/payments/components/PaymentReceiptCard.test.tsx
git commit -m "feat: add e-receipt style PaymentReceiptCard"
```

---

### Task 2: Wire `PaymentReceiptCard` into `InvoicesTab`

**Files:**
- Modify: `frontend/src/modules/projects/components/InvoicesTab.tsx`

**Interfaces:**
- Consumes: `PaymentReceiptCard` from Task 1 (`project`, `quotation`, `payment` props as defined above).
- Produces: nothing new for later tasks — this is the last task in the plan.

- [ ] **Step 1: Remove now-unused imports and status maps**

In `frontend/src/modules/projects/components/InvoicesTab.tsx`, replace the import block:

```tsx
import { CheckCircle2 } from 'lucide-react';

import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { LoadingSpinner } from '@/shared/components/common/LoadingSpinner';
import { formatPHP, toNumber } from '@/shared/utils/currency';
import { formatTimelineRange } from '@/shared/utils/timeline';
import type { ApiError } from '@/shared/api/apiClient';
import { useProject } from '../api/projects.queries';
import { ProjectStatusStepper } from './ProjectStatusStepper';
import {
  useAcceptQuotation,
  useRejectQuotation,
} from '@/modules/quotations/api/quotations.queries';
import { QuotationSummaryCard } from '@/modules/quotations/components/QuotationSummaryCard';
import { useProjectPayments } from '@/modules/payments/api/payments.queries';
import { PaymentForm } from '@/modules/payments/components/PaymentForm';
import { PaymentProofPreview } from '@/modules/payments/components/PaymentProofPreview';
import { PaymentScheduleCard } from '@/modules/payments/components/PaymentScheduleCard';

const PAYMENT_STATUS_BADGE = {
  pending: 'neutral',
  verification: 'warning',
  verified: 'success',
  rejected: 'danger',
} as const;

const PAYMENT_STATUS_LABEL = {
  pending: 'Pending',
  verification: 'Under Verification',
  verified: 'Verified',
  rejected: 'Rejected — please resubmit',
} as const;
```

with:

```tsx
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorState } from '@/shared/components/common/ErrorState';
import { LoadingSpinner } from '@/shared/components/common/LoadingSpinner';
import { formatPHP, toNumber } from '@/shared/utils/currency';
import { formatTimelineRange } from '@/shared/utils/timeline';
import type { ApiError } from '@/shared/api/apiClient';
import { useProject } from '../api/projects.queries';
import { ProjectStatusStepper } from './ProjectStatusStepper';
import {
  useAcceptQuotation,
  useRejectQuotation,
} from '@/modules/quotations/api/quotations.queries';
import { QuotationSummaryCard } from '@/modules/quotations/components/QuotationSummaryCard';
import { useProjectPayments } from '@/modules/payments/api/payments.queries';
import { PaymentForm } from '@/modules/payments/components/PaymentForm';
import { PaymentReceiptCard } from '@/modules/payments/components/PaymentReceiptCard';
```

(`CheckCircle2`, `Badge`, `PaymentProofPreview`, `PaymentScheduleCard`, and the two status maps are dropped — their only uses are removed in the next steps or moved into `PaymentReceiptCard`.)

- [ ] **Step 2: Replace the schedule + payment + accepted-icon block**

Replace this block (the standalone schedule card through the end of the component):

```tsx
      <PaymentScheduleCard installments={project.paymentInstallments} />

      {canSubmitPayment && nextPendingInstallment && (
        <Card className="mx-auto w-full max-w-md">
          <CardHeader>
            <CardTitle>Select a payment method</CardTitle>
          </CardHeader>
          <CardContent>
            {latestPayment?.status === 'rejected' && (
              <Alert
                className="mb-4"
                variant="danger"
                title="Your previous payment wasn't verified"
                description="Please double-check your details and resubmit proof of payment."
              />
            )}
            <PaymentForm
              key={nextPendingInstallment.id}
              projectId={project.id}
              installment={nextPendingInstallment}
            />
          </CardContent>
        </Card>
      )}

      {latestPayment && (
        <Card className="mx-auto w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Payment</CardTitle>
              <Badge variant={PAYMENT_STATUS_BADGE[latestPayment.status]}>
                {PAYMENT_STATUS_LABEL[latestPayment.status]}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {isFullyPaid ? (
              <Alert
                variant="success"
                title="Your project has been accepted!"
                description="We'll be in touch shortly to schedule development."
              />
            ) : latestPayment.status === 'verification' ? (
              <Alert
                variant="warning"
                title="Payment under verification"
                description="We've received your payment and are verifying it. This page updates automatically."
              />
            ) : project.status_code === 'accepted' ? (
              <Alert
                variant="info"
                title="Downpayment received"
                description={`${remainingInstallmentCount} installment${remainingInstallmentCount === 1 ? '' : 's'} remaining. You can submit your next payment below.`}
              />
            ) : null}
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-muted-foreground">Amount</dt>
              <dd className="text-right font-medium text-foreground">
                {formatPHP(latestPayment.amount)}
              </dd>
              <dt className="text-muted-foreground">Reference number</dt>
              <dd className="text-right font-medium text-foreground">
                {latestPayment.reference_number ?? '—'}
              </dd>
            </dl>
            <PaymentProofPreview proofUrl={latestPayment.proof_of_payment_url} />
          </CardContent>
        </Card>
      )}

      {project.status_code === 'accepted' && !latestPayment && isFullyPaid && (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <CheckCircle2 className="size-10 text-success" aria-hidden="true" />
          <p className="text-base font-semibold text-foreground">Your project has been accepted!</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            We'll be in touch shortly to schedule development.
          </p>
        </div>
      )}
    </div>
  );
}
```

with:

```tsx
      {latestPayment &&
        (isFullyPaid ? (
          <Alert
            variant="success"
            title="Your project has been accepted!"
            description="We'll be in touch shortly to schedule development."
          />
        ) : latestPayment.status === 'verification' ? (
          <Alert
            variant="warning"
            title="Payment under verification"
            description="We've received your payment and are verifying it. This page updates automatically."
          />
        ) : project.status_code === 'accepted' ? (
          <Alert
            variant="info"
            title="Downpayment received"
            description={`${remainingInstallmentCount} installment${remainingInstallmentCount === 1 ? '' : 's'} remaining. You can submit your next payment below.`}
          />
        ) : null)}

      <PaymentReceiptCard project={project} quotation={latestQuotation} payment={latestPayment} />

      {canSubmitPayment && nextPendingInstallment && (
        <Card className="mx-auto w-full max-w-md">
          <CardHeader>
            <CardTitle>Select a payment method</CardTitle>
          </CardHeader>
          <CardContent>
            {latestPayment?.status === 'rejected' && (
              <Alert
                className="mb-4"
                variant="danger"
                title="Your previous payment wasn't verified"
                description="Please double-check your details and resubmit proof of payment."
              />
            )}
            <PaymentForm
              key={nextPendingInstallment.id}
              projectId={project.id}
              installment={nextPendingInstallment}
            />
          </CardContent>
        </Card>
      )}

      {project.status_code === 'accepted' && !latestPayment && isFullyPaid && (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <p className="text-base font-semibold text-foreground">Your project has been accepted!</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            We'll be in touch shortly to schedule development.
          </p>
        </div>
      )}
    </div>
  );
}
```

Note `formatPHP` and `toNumber` stay imported — both still used earlier in the file (`latestQuotation.total_amount` / `latestQuotation.base_price` in the `QuotationSummaryCard` block).

- [ ] **Step 3: Typecheck and lint**

Run: `npm --prefix frontend run build`
Expected: builds clean, no TypeScript errors (unused-import errors would surface here first).

Run: `npm --prefix frontend run lint`
Expected: no new lint errors.

- [ ] **Step 4: Run full frontend test suite**

Run: `npm --prefix frontend test`
Expected: PASS, including the 3 new `PaymentReceiptCard` tests and the existing `App.test.tsx`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/modules/projects/components/InvoicesTab.tsx
git commit -m "feat: replace Invoices payment card with e-receipt view"
```

---

### Task 3: Manual QA

**Files:** none (verification only).

- [ ] **Step 1: Start the app**

Run: `npm run dev` (from repo root — starts backend + frontend concurrently per `CLAUDE.md`).

- [ ] **Step 2: Walk the client Invoices tab**

As a client user with an accepted quotation and at least one submitted payment, open a project's Invoices tab. Confirm:
- Logo + "Payment Receipt" + quotation number appear at the top.
- Breakdown lists base price, each add-on, and total, matching the accepted quotation.
- "Pages Included" lists the package's pages (skip this check if the project used a custom/no-package quotation — section should be absent there instead).
- Payment schedule table/list appears inside the receipt (not as a separate card above it).
- Latest payment section shows status badge, amount, method, reference number — no uploaded proof image anywhere on the page.
- No checkmark icon appears in the "Your project has been accepted!" state.
- The 3 status Alerts (success / under-verification / downpayment-received) still appear above the receipt at the right times.

- [ ] **Step 3: Check responsive layout**

Resize to a mobile viewport (or use browser dev tools device mode). Confirm the payment schedule falls back to the stacked list layout (existing `PaymentScheduleCard` behavior) and the rest of the receipt doesn't overflow horizontally.

- [ ] **Step 4: Check a project with no payments yet**

Open a project where the quotation was just accepted and no payment has been submitted. Confirm the receipt still renders (breakdown, pages, schedule) with the "Latest Payment" section simply absent (no crash on `payment: undefined`).
