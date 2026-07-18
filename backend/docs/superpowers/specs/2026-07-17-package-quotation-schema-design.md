# Package, Quotation & Project Schema — Design

Date: 2026-07-17
Status: Implemented (migrations applied to local dev DB)
Author: Database Engineer

## Context

Adds the domain schema for the package catalog, add-on catalog, quotations,
projects, and payments, per the product spec's Client Workflow / Package /
Quotation / Payment sections. This is a pure schema + seed-data deliverable —
no application code (controllers/services/routes) was touched. It is the
contract the Backend Engineer implements against.

**Important caveat:** no product spec document was found anywhere in the
repo (`backend/docs`, `frontend/docs`, repo root). Everything here was built
from the prose description handed down in the task brief. Two places in that
brief reference spec content that was not itself included:

1. The spec's full "Project Status" table (said to have exactly 20 rows) —
   not enumerated in the brief. **Resolved**: the Team Lead subsequently
   supplied the authoritative 21-row table verbatim, and
   `016_reconcile_project_statuses.sql` replaced the placeholder seed data
   with it. See "Status Representation Decision" below for the final,
   correct list — this was a data-only fix, no schema change, exactly as
   the lookup-table design was intended to allow.
2. Exhaustive add-on pricing beyond the four examples given (Client
   Dashboard, Admin Dashboard, Google Analytics, Live Chat). **Still
   outstanding** — placeholder prices remain in `015_seed_addons.sql`,
   documented in "Pricing / Timeline Assumptions" below.

Gap 2 is called out explicitly below, with the design chosen specifically to
make correcting it cheap (an `UPDATE` against `addons`, no migration
required) once real pricing is available.

## Migrations Created

All in `backend/db/migrations/`, applied in order, continuing the existing
numbered-SQL convention (`schema_migrations` tracks applied filenames):

| File | Summary |
|---|---|
| `003_create_set_updated_at_function.sql` | Reusable `set_updated_at()` trigger function for `updated_at` maintenance. |
| `004_create_project_statuses.sql` | Lookup table for project lifecycle status + seeds 21 placeholder rows (see Status Representation below). |
| `005_create_project_packages.sql` | `project_packages` table, indexes, `updated_at` trigger. |
| `006_create_package_pages.sql` | `package_pages` table (owned by package, cascade delete). |
| `007_create_package_features.sql` | `package_features` table (owned by package, cascade delete). |
| `008_create_addons.sql` | `addons` shared catalog table, indexes, `updated_at` trigger. |
| `009_create_projects.sql` | `projects` table (request + lifecycle), indexes, `updated_at` trigger. |
| `010_create_project_assignments.sql` | `project_assignments` join table (staff-to-project, many-to-many). |
| `011_create_quotations.sql` | `quotation_number_seq` sequence + `quotations` table, indexes. |
| `012_create_quotation_addons.sql` | `quotation_addons` join table with price snapshot. |
| `013_create_payments.sql` | `payments` table, indexes. |
| `014_seed_project_packages.sql` | Seeds Starter/Business/Corporate/Custom packages + their pages + features. |
| `015_seed_addons.sql` | Seeds the full add-on catalog (26 rows across 6 categories). |
| `016_reconcile_project_statuses.sql` | Replaces the placeholder `project_statuses` rows with the authoritative 21-row spec table (supplied after 004 was already applied); updates `projects.status_code`'s default from the old placeholder `pending_review` to `submitted`. |

Existing `registration`, `users`, `refresh_tokens` tables/migrations were not
touched, per constraints.

## ER / Relationship Decisions

**`projects` vs `quotations` FK direction:** `quotations.project_id` FKs to
`projects.id` (quotation belongs to project), not the reverse. Reasoning:
the Client Workflow submits a project *request* first (step 5), which is
then reviewed, and only afterward is a quotation generated against it. A
`projects` row therefore must be able to exist before any quotation does.
Making `quotations` the child also lets a project accumulate more than one
quotation over its life (e.g. a revised quote after client feedback) without
a schema change — `projects` 1 : `quotations` many.

**Add-ons are a shared catalog, not package-specific:** `addons` has no
`package_id`. Clients pick from the same catalog regardless of package,
matching the spec's "Additional Features" section (Authentication /
Dashboard / Payments / Reports / Communication / Integrations), independent
of "Package Add-ons" terminology used elsewhere in the spec. `quotation_addons`
is the join between a specific quotation and the add-ons selected for it.

**Historical pricing/timeline integrity:** `quotations` snapshots
`base_price` and `estimated_timeline_min_days`/`max_days` from the package at
quote time (packages can be re-priced later without altering past
quotations). `quotation_addons.price_at_time` snapshots the add-on's price
at the moment it was attached to a quotation, for the same reason.

**`ON DELETE` behavior, decided per relationship:**

| Relationship | Behavior | Why |
|---|---|---|
| `package_pages.package_id`, `package_features.package_id` → `project_packages.id` | `CASCADE` | Pages/features are owned entirely by their package; they have no independent meaning. |
| `projects.package_id` → `project_packages.id` | `RESTRICT` | A package must not be hard-deletable while historical/active projects reference it — forces the admin to deactivate (`is_active = false`) instead, preserving reporting integrity. |
| `quotations.package_id` → `project_packages.id` | `RESTRICT` | Same reasoning — historical quotations must always be traceable to the package they quoted, even though the price/timeline are already snapshotted. |
| `quotation_addons.addon_id` → `addons.id` | `RESTRICT` | Same reasoning as packages — deactivate (`is_active = false`) rather than delete. |
| `quotations.project_id` → `projects.id` | `CASCADE` | Quotations have no meaning independent of their project. |
| `quotation_addons.quotation_id` → `quotations.id` | `CASCADE` | Owned line items of a quotation. |
| `payments.project_id` → `projects.id` | `CASCADE` | Payments are scoped to a project's lifecycle. |
| `project_assignments.project_id` → `projects.id` | `CASCADE` | Assignment rows have no meaning without the project. |
| `project_assignments.user_id`, `payments.verified_by`, `project_packages.created_by` → `users.user_id` | `SET NULL` (assignments: `CASCADE` on user_id since it's part of the PK — see note) | Preserves the project/payment/package record even if the referenced staff account is later removed. |
| `projects.client_id` → `users.user_id` | `RESTRICT` | A client with project history should never be hard-deletable without an explicit decision; forces deactivation (`users.is_active = false`) instead. |
| `projects.status_code` → `project_statuses.code` | `RESTRICT` / `ON UPDATE CASCADE` | Can't delete a status still in use; renaming a status `code` (rare) propagates automatically. |

Note on `project_assignments`: `user_id` is part of the composite primary
key `(project_id, user_id)`, so it uses `ON DELETE CASCADE` (a `SET NULL` on
a PK column is not possible) — the assignment row itself is removed if
either side is deleted, which is correct since an assignment link has no
meaning with a dangling side. `assigned_by` (an audit-only reference, not
part of the PK) uses `SET NULL`.

## Status Representation Decision

`projects.status` is modeled as `status_code VARCHAR(40)` with a **foreign
key to a lookup table** (`project_statuses`), not a `CHECK` constraint enum.

Why: the brief says the spec's Project Status table has exactly 20 entries,
but did not include that table's contents, and no spec document exists in
the repo to look it up in. A `CHECK` constraint enum baked into the column
definition would require a new migration every time a status needs to be
renamed, reordered, or corrected against the real list. A lookup table lets
that happen with a plain `UPDATE`/`INSERT`/`DELETE` against
`project_statuses` instead — no migration, no downtime, and `projects` rows
referencing a renamed code are unaffected (`ON UPDATE CASCADE` handles code
renames automatically).

`project_statuses` seed data — **reconciled** by `016_reconcile_project_statuses.sql`
against the authoritative 21-row Project Status table, supplied verbatim by
the Team Lead after `004_create_project_statuses.sql` had already been
applied with placeholder rows (see "Important caveat" above and the
"Placeholder history" subsection below). `code` values are stable snake_case
derived from each spec display name, matching the casing convention already
established by the (now-replaced) placeholders:

| # | code | label | display_order | is_terminal |
|---|---|---|---|---|
| 1 | draft | Draft | 10 | false |
| 2 | submitted | Submitted | 20 | false |
| 3 | under_review | Under Review | 30 | false |
| 4 | waiting_for_client | Waiting for Client | 40 | false |
| 5 | quotation_sent | Quotation Sent | 50 | false |
| 6 | quotation_accepted | Quotation Accepted | 60 | false |
| 7 | quotation_rejected | Quotation Rejected | 70 | false |
| 8 | payment_pending | Payment Pending | 80 | false |
| 9 | payment_verification | Payment Verification | 90 | false |
| 10 | accepted | Accepted | 100 | false |
| 11 | scheduled | Scheduled | 110 | false |
| 12 | in_development | In Development | 120 | false |
| 13 | in_testing | In Testing | 130 | false |
| 14 | client_review | Client Review | 140 | false |
| 15 | revision_requested | Revision Requested | 150 | false |
| 16 | revision_in_progress | Revision In Progress | 160 | false |
| 17 | ready_for_deployment | Ready for Deployment | 170 | false |
| 18 | deployed | Deployed | 180 | false |
| 19 | completed | Completed | 190 | **true** |
| 20 | on_hold | On Hold | 200 | false |
| 21 | cancelled | Cancelled | 210 | **true** |

This is exact — 21 rows, in this exact order, matching the spec's `#`
column via `display_order = # * 10`. `is_terminal` is set only for
`completed` and `cancelled` — the only two states the spec's own
descriptions explicitly frame as an end state ("completed and delivered" /
"has been cancelled"). `quotation_rejected` and `on_hold` are deliberately
**not** terminal: a rejected quotation can be followed by a new quotation
against the same project (another `quotations` row), and an on-hold project
is paused, not ended.

No transition/state-machine table exists anywhere in this schema —
`project_statuses` is a flat lookup, not a graph of valid next-states — so
`on_hold` and `cancelled` are already reachable from every status
(`projects.status_code` can be set to any value in the lookup table
regardless of its current value; there is no adjacency constraint to
update).

Reconciliation was a pure data change (`DELETE` + `INSERT` on
`project_statuses`, plus one `ALTER TABLE ... SET DEFAULT`), not a schema
change, confirming the original lookup-table design decision was the right
call for handling this exact situation.

`projects.status_code`'s default was updated from the old placeholder value
`pending_review` to `submitted` (spec row 2, "Project request has been
submitted") — `draft` (row 1) is reserved for a client still composing the
request, before a `projects` row would typically be persisted.

### Placeholder history (superseded, kept for traceability)

`004_create_project_statuses.sql` originally seeded 21 different placeholder
rows (`pending_review`, `quotation_preparation`, `awaiting_downpayment`,
etc.) because the real Project Status table wasn't available at authoring
time. Those rows no longer exist — `016_reconcile_project_statuses.sql`
deleted and replaced them wholesale. No `projects` rows existed at
reconciliation time (verified via `SELECT DISTINCT status_code FROM
projects` returning zero rows), so no data migration of in-flight projects
was needed.

`quotations.status` and `payments.status`, by contrast, use plain `CHECK`
constraints (5 and 4 values respectively) — those sets are small, standard,
and were fully specified in the brief, so the flexibility of a lookup table
wasn't worth the extra join.

## Final Schema

### `project_statuses`
| Column | Type | Notes |
|---|---|---|
| code | VARCHAR(40) | PK |
| label | VARCHAR(60) | NOT NULL |
| display_order | SMALLINT | NOT NULL, UNIQUE |
| is_terminal | BOOLEAN | NOT NULL DEFAULT false |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() |

### `project_packages`
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK, default `gen_random_uuid()` |
| name | VARCHAR(120) | NOT NULL |
| slug | VARCHAR(140) | NOT NULL, UNIQUE |
| description | TEXT | |
| base_price | NUMERIC(12,2) | NULL only if `is_custom = true` |
| estimated_timeline_min_days | INTEGER | nullable |
| estimated_timeline_max_days | INTEGER | nullable, ≥ min if both set |
| display_order | INTEGER | NOT NULL DEFAULT 0 |
| is_active | BOOLEAN | NOT NULL DEFAULT true |
| thumbnail_url | TEXT | file path/URL, populated by multer upload handling (backend's job) |
| banner_url | TEXT | same |
| is_custom | BOOLEAN | NOT NULL DEFAULT false |
| created_by | BIGINT | FK → `users.user_id`, `ON DELETE SET NULL` |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT now(), auto-maintained by trigger |

Indexes: `is_active`, `display_order`, `created_by`.

### `package_pages`
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| package_id | UUID | FK → `project_packages.id`, `ON DELETE CASCADE` |
| name | VARCHAR(120) | NOT NULL |
| display_order | INTEGER | NOT NULL DEFAULT 0 |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() |

Index: `package_id`.

### `package_features`
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| package_id | UUID | FK → `project_packages.id`, `ON DELETE CASCADE` |
| name | VARCHAR(160) | NOT NULL |
| display_order | INTEGER | NOT NULL DEFAULT 0 |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() |

Index: `package_id`.

### `addons`
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| category | VARCHAR(40) | CHECK IN (`authentication`,`dashboard`,`payments`,`reports`,`communication`,`integrations`) |
| name | VARCHAR(120) | NOT NULL, UNIQUE with `category` |
| price | NUMERIC(12,2) | NOT NULL, ≥ 0 |
| description | TEXT | |
| display_order | INTEGER | NOT NULL DEFAULT 0 |
| is_active | BOOLEAN | NOT NULL DEFAULT true |
| created_at / updated_at | TIMESTAMPTZ | `updated_at` auto-maintained by trigger |

Indexes: `is_active`, `category`.

### `projects`
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| client_id | BIGINT | FK → `users.user_id`, `ON DELETE RESTRICT`, NOT NULL |
| package_id | UUID | FK → `project_packages.id`, `ON DELETE RESTRICT`, nullable (custom) |
| title | VARCHAR(200) | NOT NULL — **addition, not in the brief's literal column list**; see note below |
| request_details | TEXT | **addition** — see note below |
| status_code | VARCHAR(40) | FK → `project_statuses.code`, `ON DELETE RESTRICT ON UPDATE CASCADE`, NOT NULL DEFAULT `'submitted'` |
| timeline_estimate_min_days | INTEGER | nullable |
| timeline_estimate_max_days | INTEGER | nullable, ≥ min if both set |
| start_date | DATE | nullable |
| end_date | DATE | nullable, ≥ start_date if both set |
| completion_date | DATE | nullable |
| created_at / updated_at | TIMESTAMPTZ | `updated_at` auto-maintained by trigger |

Indexes: `client_id`, `package_id`, `status_code`.

**Addition note:** the brief's column list for `projects` did not include a
name/title or a place to record what the client actually requested. Without
`title`/`request_details`, step 5 of the Client Workflow ("project request
submitted") has nowhere to persist the request content before a quotation
exists. Added both, flagged here for Backend Engineer awareness — remove or
rename if the real spec defines equivalents elsewhere.

### `project_assignments`
| Column | Type | Notes |
|---|---|---|
| project_id | UUID | FK → `projects.id`, `ON DELETE CASCADE`, part of PK |
| user_id | BIGINT | FK → `users.user_id`, `ON DELETE CASCADE`, part of PK |
| assigned_by | BIGINT | FK → `users.user_id`, `ON DELETE SET NULL` |
| assigned_at | TIMESTAMPTZ | NOT NULL DEFAULT now() |

PK: `(project_id, user_id)`. Index: `user_id`. No existing "team assignment"
concept was found elsewhere in the codebase to reuse.

### `quotations`
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| quotation_number | VARCHAR(20) | NOT NULL, UNIQUE, default `'Q-' \|\| nextval(quotation_number_seq)` (sequence starts at 2001) — **addition**, see note below |
| project_id | UUID | FK → `projects.id`, `ON DELETE CASCADE`, NOT NULL |
| package_id | UUID | FK → `project_packages.id`, `ON DELETE RESTRICT`, nullable (custom) |
| base_price | NUMERIC(12,2) | NOT NULL, ≥ 0 — snapshot |
| estimated_timeline_min_days | INTEGER | nullable — snapshot |
| estimated_timeline_max_days | INTEGER | nullable, ≥ min if both set — snapshot |
| discount_amount | NUMERIC(12,2) | NOT NULL DEFAULT 0, ≥ 0 |
| total_amount | NUMERIC(12,2) | NOT NULL, ≥ 0 |
| status | VARCHAR(20) | CHECK IN (`draft`,`sent`,`accepted`,`rejected`,`expired`), DEFAULT `'draft'` |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() |
| sent_at | TIMESTAMPTZ | nullable |
| responded_at | TIMESTAMPTZ | nullable |

Indexes: `project_id`, `package_id`, `status`.

**Addition note:** `quotation_number` wasn't in the brief's literal column
list, but existing frontend mock data (`dashboard-admin/mockData.ts`,
`dashboard-staff/mockData.ts`) already displays quotations as `"Q-2088"`
etc., so a real generated identifier was added rather than leaving the
Backend Engineer to bolt one on ad hoc later.

**Not added:** an `addons_total` convenience column was considered but
deliberately left out — it's derivable at query time from
`SUM(quotation_addons.price_at_time)` and keeping it out avoids a
denormalized value that could drift from its join.

### `quotation_addons`
| Column | Type | Notes |
|---|---|---|
| quotation_id | UUID | FK → `quotations.id`, `ON DELETE CASCADE`, part of PK |
| addon_id | UUID | FK → `addons.id`, `ON DELETE RESTRICT`, part of PK |
| price_at_time | NUMERIC(12,2) | NOT NULL, ≥ 0 — snapshot |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() |

PK: `(quotation_id, addon_id)`. Index: `addon_id`.

### `payments`
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| project_id | UUID | FK → `projects.id`, `ON DELETE CASCADE`, NOT NULL |
| payment_method | VARCHAR(20) | CHECK IN (`bank_transfer`,`gcash`,`maya`) |
| amount | NUMERIC(12,2) | NOT NULL, > 0 |
| reference_number | VARCHAR(100) | nullable |
| proof_of_payment_url | TEXT | file path/URL, populated by multer upload handling (backend's job) |
| status | VARCHAR(20) | CHECK IN (`pending`,`verification`,`verified`,`rejected`), DEFAULT `'pending'` |
| verified_by | BIGINT | FK → `users.user_id`, `ON DELETE SET NULL` |
| verified_at | TIMESTAMPTZ | nullable |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() |

Indexes: `project_id`, `status`, `verified_by`.

## Pricing / Timeline Assumptions (not given directly in the brief)

- **Starter Website base price: ₱25,000.** ~55% of Business Website's given
  ₱45,000, reflecting fewer pages (6 vs 10) and no CMS/blog/analytics tier.
- **Corporate Website base price: ₱85,000.** ~1.9x Business Website,
  reflecting more pages (12 vs 10), longer timeline (4-8 weeks vs 2-4), and
  materially more complex features (multi-user CMS, search, performance
  optimization).
- **Timeline → days conversion:** 1 week = 7 days. Starter 1-2wk → 7-14
  days; Business 2-4wk → 14-28 days; Corporate 4-8wk → 28-56 days.
- **Add-on prices not given in the spec's worked example** (everything
  except Client Dashboard ₱12,000, Admin Dashboard ₱18,000, Google Analytics
  ₱2,500, Live Chat ₱4,000): priced in tiers inferred from those four
  anchors — see the reasoning comment at the top of
  `db/migrations/015_seed_addons.sql` for the full breakdown per tier and
  per add-on. Staff Dashboard priced at ₱15,000 (between the two given
  dashboard prices).

All of the above are placeholders pending the actual pricing sheet / product
spec and are expected to be corrected via the admin UI the Backend/Frontend
Engineers build next — no schema changes needed to do so.

## Performance Notes

- Every FK column has a supporting index (listed per table above) to avoid
  sequential scans on join/cascade-check paths.
- `is_active` is indexed on `project_packages` and `addons` since the client
  portal filters to active packages/add-ons on every catalog read.
- `status`/`status_code` is indexed on `quotations`, `payments`, and
  `projects` since admin queues filter by status.
- `quotation_number` and `project_packages.slug` are unique-indexed
  (implicit via the `UNIQUE` constraint), supporting fast lookups by either.

## Verification

Ran against the local Postgres instance configured in `backend/.env`
(`DB_HOST=localhost`, `DB_NAME=codehaus`) via `npm run migrate` — **all 13
initial migrations (003-015) applied successfully** and `schema_migrations`
now tracks them. Re-running `npm run migrate` afterward is a no-op ("Up to
date"), confirming idempotency.

Additional sanity checks performed directly against the DB (all inside a
rolled-back transaction, no data left behind):
- `project_packages_price_required_unless_custom` CHECK correctly rejects a
  non-custom package with a NULL price.
- `set_updated_at()` trigger correctly bumps `updated_at` on `UPDATE`.
- `projects.status_code` FK correctly rejects an unknown status code.
- End-to-end happy path (insert project → insert quotation → insert
  quotation_addons referencing the seeded "Client Dashboard" add-on) all
  succeeded, including the `quotation_number` default (`Q-2001`).
- `project_packages` delete is correctly blocked (`RESTRICT`) once a project
  references it.

**Reconciliation migration (`016_reconcile_project_statuses.sql`)** was
applied afterward, in its own `npm run migrate` run, once the real status
list was supplied:
- Verified `SELECT DISTINCT status_code FROM projects` returned zero rows
  beforehand (no live data referenced the old placeholder codes), so the
  wholesale `DELETE` + re-`INSERT` was safe.
- Migration applied cleanly; `npm run migrate` reported "Up to date" on the
  next run (idempotent).
- Post-migration query confirms all 21 rows match the spec exactly, in the
  spec's exact order, with `display_order` 10-210 mirroring the `#` column.
- `projects.status_code` column default confirmed updated to `'submitted'`.

## Out of Scope (next agent: Backend Engineer)

- Multer upload handling for `thumbnail_url`, `banner_url`,
  `proof_of_payment_url` (schema has the columns; upload wiring is not this
  deliverable).
- Services/controllers/routes for packages, quotations, projects, payments.
