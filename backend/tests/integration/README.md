# Backend integration tests (opt-in)

These tests execute **real SQL against a real PostgreSQL database**. They are
deliberately **not** part of `npm test`.

```bash
# Default suite -- fast, hermetic, needs NO database. Unchanged.
npm --prefix backend test

# Integration suite -- needs a local Postgres with migrations applied.
npm --prefix backend run migrate
npm --prefix backend run test:integration
```

## Why these are separate

Every test in the default suite points `DB_HOST`/`DB_PORT` at a closed port so
that nothing can reach a database. That is intentional: it keeps `npm test`
fast, deterministic, and runnable on a machine with no Postgres installed.

The cost was that **no SQL in this backend was ever executed by a test.** The
client-name join bugs from the role-separation pass were found by running
queries by hand, not by the suite — the suite structurally could not have caught
them.

This suite closes that gap without giving up the property that made the default
suite good. Two separate entry points, two separate contracts:

| | `npm test` | `npm run test:integration` |
|---|---|---|
| Config | `vitest.config.js` | `vitest.integration.config.js` |
| Needs Postgres | No | Yes |
| Reaches SQL | Never | Always |
| Runs in default workflow | Yes | No |

`vitest.config.js` explicitly **excludes** `tests/integration/**`, because its
`tests/**/*.test.js` glob would otherwise sweep these in and make the default
suite depend on a database.

## What it connects to

Whatever `backend/.env` already configures (`DB_HOST`, `DB_PORT`, `DB_USER`,
`DB_PASSWORD`, `DB_NAME`) — the same database you develop against. No extra
setup, no separate test database to provision.

## Is it safe to run against my dev database?

Yes. **Every test runs inside a transaction that is unconditionally rolled
back** (`tests/integration/helpers/db.js`). Fixtures are inserted and the
repository functions under test are handed that same transaction client, so the
genuine query text runs against genuine tables and then leaves zero trace.

This works because every repository function in this codebase already accepts a
trailing `db = pool` argument. These tests are therefore exercising the real
SQL, not a re-implementation of it.

## If you don't have Postgres running

The suite **skips**, it does not fail. A probe runs once per file and prints an
actionable reason:

- database unreachable → `npm run test:integration` reports skips
- database reachable but behind on migrations → tells you to run
  `npm --prefix backend run migrate`

## What is covered

- `projects.repository.js` → `PROJECT_WITH_CLIENT_SELECT`
- `payments.repository.js` → `PAYMENT_WITH_CONTEXT_SELECT`, `insert`, `reject`
- Migrations `027_add_payment_shortfall_amount.sql` and
  `028_add_payment_rejection_reason.sql`: column types, NOT NULL, defaults, and
  the `payments_shortfall_amount_non_negative` CHECK constraint actually firing
- A drift check that every migration file on disk has been applied

The LEFT-JOIN cases are the most valuable assertions here: an admin list must
never silently *drop* a project or a payment because a joined identity row is
missing, and only real SQL can prove that.

## Deliberately out of scope

No CI pipeline and no Docker/containerised test database. This project has
neither today (see `CLAUDE.md`), and adding one is a separate, larger
initiative. This is the smallest change that lets a developer with local
Postgres verify real SQL.
