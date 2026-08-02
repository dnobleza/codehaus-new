import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.js', 'tests/**/*.test.js'],
    // These are unit tests over middleware and pure logic; nothing here should
    // reach Postgres. A test that needs a live database belongs in a separate
    // integration project with its own setup, not silently mixed in here.
    globals: false,
  },
});
