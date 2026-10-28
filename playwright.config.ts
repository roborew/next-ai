import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

/**
 * The e2e suite must never touch the development database. It runs its own
 * server on a dedicated port, against a separate database derived from
 * `DATABASE_URL` (or set explicitly via `E2E_DATABASE_URL`).
 *
 * `tests/e2e/global-setup.ts` creates and migrates that database, then clears
 * it; `global-teardown.ts` clears it again after the run.
 */
const e2eDatabaseUrl = (() => {
  if (process.env.E2E_DATABASE_URL) {
    return process.env.E2E_DATABASE_URL;
  }

  const developmentUrl = process.env.DATABASE_URL;
  if (!developmentUrl) {
    throw new Error("Set DATABASE_URL (or E2E_DATABASE_URL) to run the e2e suite.");
  }

  const url = new URL(developmentUrl);
  url.pathname = `${url.pathname.replace(/\/$/, "")}_test`;
  return url.toString();
})();

// Global setup/teardown and the Next.js server spawned below inherit this.
process.env.DATABASE_URL = e2eDatabaseUrl;

const e2ePort = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://localhost:${e2ePort}`;

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  /* Only end-to-end specs live here; unit/integration tests belong to Vitest. */
  testDir: "./tests/e2e",
  /* Creates/migrates the e2e database and clears it before the run. */
  globalSetup: "./tests/e2e/global-setup.ts",
  /* Clear the e2e database after the run. */
  globalTeardown: "./tests/e2e/global-teardown.ts",
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: "html",
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    baseURL,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },

    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },

    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],

  /* Run the app against the e2e database on its own port. */
  webServer: {
    command: `pnpm dev --port ${e2ePort}`,
    url: baseURL,
    /* Never reuse a server started for development: it would use the dev DB. */
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DATABASE_URL: e2eDatabaseUrl,
      /* Keep the e2e dev server's build state and lockfile separate so it can
         run while `pnpm dev` is also running. */
      NEXT_DIST_DIR: ".next-e2e",
    },
  },
});
