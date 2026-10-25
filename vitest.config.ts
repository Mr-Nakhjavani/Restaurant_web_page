import path from "node:path";
import { defineConfig } from "vitest/config";

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://bayt:bayt_dev_password@localhost:5433/bayt_al_ghaf_test?schema=public";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["tests/unit/**/*.test.ts"],
          environment: "node",
          env: { NODE_ENV: "test", DATABASE_URL: "postgresql://unused:unused@localhost:1/unused", ENABLE_TEST_CLOCK: "true" },
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          environment: "node",
          globalSetup: ["tests/integration/global-setup.ts"],
          testTimeout: 30_000,
          hookTimeout: 60_000,
          env: {
            NODE_ENV: "test",
            DATABASE_URL: TEST_DATABASE_URL,
            ENABLE_TEST_CLOCK: "true",
            RATE_LIMIT_ENABLED: "false",
            SIMULATE_KITCHEN_PROGRESS: "false",
            ADMIN_SESSION_SECRET: "test-secret-0123456789abcdefghijklmnopqrstuvwxyz",
            APP_BASE_URL: "http://localhost:3000",
            CORS_ALLOWED_ORIGINS: "http://localhost:3000",
            SEED_ADMIN_EMAIL: "admin@baytalghaf.example",
            SEED_ADMIN_PASSWORD: "Test-Admin-Password-1",
            SEED_STAFF_EMAIL: "staff@baytalghaf.example",
            SEED_STAFF_PASSWORD: "Test-Staff-Password-1",
            SEED_AGENT_API_KEY: "bg_test_agent_key_0123456789",
          },
        },
      },
    ],
  },
});
