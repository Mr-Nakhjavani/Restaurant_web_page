import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE = `http://localhost:${PORT}`;
export const E2E_DATABASE_URL = process.env.E2E_DATABASE_URL ?? "postgresql://bayt:bayt_dev_password@localhost:5433/bayt_al_ghaf_e2e?schema=public";

const serverEnv = {
  DATABASE_URL: E2E_DATABASE_URL,
  APP_ENV: "test",
  APP_BASE_URL: BASE,
  CORS_ALLOWED_ORIGINS: BASE,
  ADMIN_SESSION_SECRET: "e2e-only-secret-9f8e7d6c5b4a39281706f5e4d3c2b1a0",
  RATE_LIMIT_ENABLED: "false",
  ENABLE_TEST_CLOCK: "false",
  SIMULATE_KITCHEN_PROGRESS: "false",
  SEED_ADMIN_EMAIL: "admin@baytalghaf.example",
  SEED_ADMIN_PASSWORD: "E2E-Admin-Password-1",
  SEED_STAFF_EMAIL: "staff@baytalghaf.example",
  SEED_STAFF_PASSWORD: "E2E-Staff-Password-1",
  SEED_AGENT_API_KEY: "bg_e2e_agent_key_0123456789",
  NEXT_TELEMETRY_DISABLED: "1",
};

/** Run `npm run build` first; the suite starts the production server against the *_e2e database. */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: { baseURL: BASE, trace: "retain-on-failure", screenshot: "only-on-failure" },
  webServer: {
    command: `npx tsx scripts/reset-test-db.ts && npx next start -p ${PORT}`,
    url: `${BASE}/api/health`,
    timeout: 120_000,
    reuseExistingServer: false,
    env: serverEnv,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, grepInvert: /@desktop-only/ },
  ],
});
