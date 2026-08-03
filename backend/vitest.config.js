import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.js', 'tests/**/*.test.js'],
    // These are unit tests over middleware and pure logic; nothing here should
    // reach Postgres. A test that needs a live database belongs in a separate
    // integration project with its own setup, not silently mixed in here.
    //
    // `tests/integration/**` is now exactly that separate project -- see
    // vitest.integration.config.js and `npm run test:integration`. It is
    // EXCLUDED here rather than merely left un-included, because the
    // `tests/**/*.test.js` glob above would otherwise sweep it straight back
    // in, which would make the default suite depend on a live database: the
    // precise property this file exists to protect. `npm test` stays fast,
    // hermetic, and runnable with no Postgres installed.
    //
    // Vitest's own defaults are restated because supplying `exclude` REPLACES
    // the defaults rather than extending them.
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/integration/**'],
    globals: false,
  },
});
