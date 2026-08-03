import { defineConfig } from 'vitest/config';

/**
 * The OPT-IN integration suite: `npm run test:integration`.
 *
 * WHY IT IS A SEPARATE CONFIG AND NOT A FLAG ON THE DEFAULT ONE
 * ------------------------------------------------------------
 * Every test in the default suite (vitest.config.js) deliberately points
 * DB_HOST/DB_PORT at a closed port so nothing reaches a database. That is a
 * feature -- it keeps `npm test` fast and runnable anywhere -- but it meant no
 * SQL in this codebase was ever executed by a test. The client-name join bugs
 * from the role-separation pass were caught by running queries by hand, not by
 * the suite.
 *
 * These tests execute REAL SQL against whatever database `backend/.env` points
 * at. That is a genuinely different contract (needs Postgres, needs migrations
 * applied, is slower), so it gets its own entry point instead of a conditional
 * inside the default one. `npm test` behaviour is completely unchanged.
 *
 * Scope note: there is no CI pipeline and no Docker in this project, and this
 * change deliberately does not add either. A containerised, disposable test
 * database is the right long-term answer and is a separate initiative; this is
 * the smallest thing that lets a developer with local Postgres actually verify
 * SQL.
 *
 * Safety: every test runs inside a transaction that is ALWAYS rolled back (see
 * tests/integration/helpers/db.js), so pointing this at a working development
 * database does not mutate it.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.js'],
    globals: false,
    // Fixtures are seeded and rolled back per test, but several files insert
    // rows into the same tables; running files serially removes any chance of
    // cross-file lock contention on a single local database.
    fileParallelism: false,
    // A first connection to a database that isn't running should fail fast with
    // a clear message rather than sit at vitest's default timeout.
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
