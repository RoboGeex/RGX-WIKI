import { defineConfig } from '@playwright/test'

// E2E test suite. Run with: npm run test:e2e
// See tests/e2e/README.md for a beginner-friendly guide.
export default defineConfig({
  testDir: './tests/e2e',
  // The tests share one database, so they must run one at a time.
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  globalSetup: './tests/e2e/global-setup.ts',
  globalTeardown: './tests/e2e/global-teardown.ts',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev:next',
    url: 'http://localhost:3000',
    // If you already have `npm run dev:next` running, the tests reuse it.
    reuseExistingServer: true,
    // First compile of the dev server is slow.
    timeout: 180_000,
    // Real-DB mode: OS-level env vars beat .env.local in Next.js.
    env: { ...process.env, USE_DB: 'true' },
  },
})
