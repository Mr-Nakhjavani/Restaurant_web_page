import { z } from "zod";

const bool = (def: boolean) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === "" ? def : ["1", "true", "yes", "on"].includes(v.toLowerCase())));

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  /** Deployment tier. Only "production" enforces strict secrets and forbids the test clock. */
  APP_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
  CORS_ALLOWED_ORIGINS: z.string().default("http://localhost:3000"),
  ADMIN_SESSION_SECRET: z.string().min(32, "ADMIN_SESSION_SECRET must be at least 32 characters").default("dev-only-change-me-0123456789abcdefghijklmnop"),
  RATE_LIMIT_ENABLED: bool(true),
  TRUST_PROXY: bool(false),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  SIMULATE_KITCHEN_PROGRESS: bool(false),
  ENABLE_TEST_CLOCK: bool(false),
});

export type AppConfig = z.infer<typeof EnvSchema> & { corsOrigins: string[] };

let cached: AppConfig | null = null;

/** Validated configuration. Throws at startup with a readable message when misconfigured. */
export function getConfig(): AppConfig {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  const cfg = parsed.data;
  if (cfg.APP_ENV === "production") {
    if (/^(dev-only|change-me|test-)/i.test(cfg.ADMIN_SESSION_SECRET)) throw new Error("ADMIN_SESSION_SECRET must be set to a random secret when APP_ENV=production.");
    if (cfg.ENABLE_TEST_CLOCK) throw new Error("ENABLE_TEST_CLOCK must not be enabled when APP_ENV=production.");
  }
  cached = {
    ...cfg,
    corsOrigins: cfg.CORS_ALLOWED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean),
  };
  return cached;
}

/** For tests only. */
export function resetConfigCache() {
  cached = null;
}
