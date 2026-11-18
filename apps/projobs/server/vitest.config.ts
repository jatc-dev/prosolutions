import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    // PGlite boots a full Postgres in WASM per suite.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
