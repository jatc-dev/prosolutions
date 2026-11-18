import { defineConfig } from 'vitest/config';

export default defineConfig({
  // The API has no CSS. An inline PostCSS config stops Vite from walking up to
  // the web app's postcss.config.js (Tailwind is not installed in this package).
  css: { postcss: { plugins: [] } },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    // PGlite boots a full Postgres in WASM per suite.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
