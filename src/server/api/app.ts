import { OpenAPIHono } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { Prisma } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import type { ZodError } from "zod";
import { getConfig } from "../config";
import { ApiError, ERROR_CATALOG, errorBody, isApiError } from "../errors";
import { logger } from "../logger";
import { resolveNow } from "../clock";
import { resolvePrincipal } from "../auth/principal";
import { prisma } from "../db";
import type { AppEnv } from "./types";
import { registerInfoRoutes } from "./routes/info";
import { registerMenuRoutes } from "./routes/menu";
import { registerReservationRoutes } from "./routes/reservations";
import { registerOrderRoutes } from "./routes/orders";
import { registerBulkRoutes } from "./routes/bulk";
import { registerKnowledgeRoutes } from "./routes/knowledge";
import { registerAdminRoutes } from "./routes/admin";

export { API_VERSION } from "./version";
import { API_VERSION } from "./version";
const MAX_BODY_BYTES = 64 * 1024;

function formatIssues(error: ZodError) {
  return error.issues.map((i) => ({ path: i.path.join("."), message: i.message, code: i.code }));
}

function newRequestId() {
  return `req_${randomBytes(9).toString("base64url")}`;
}

function clientIp(headers: Headers, trustProxy: boolean): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",").map((s) => s.trim()).filter(Boolean);
    // Behind a trusted proxy the client is the first hop; otherwise use the hop added by our own server.
    return (trustProxy ? parts[0] : parts[parts.length - 1]) ?? "unknown";
  }
  return headers.get("x-real-ip") ?? "unknown";
}

export function createV1() {
  const v1 = new OpenAPIHono<AppEnv>({
    defaultHook: (result, c) => {
      if (!result.success) {
        const issues = formatIssues(result.error as unknown as ZodError);
        const first = issues[0];
        const err = new ApiError(
          "VALIDATION_ERROR",
          first ? `Invalid ${result.target}: ${first.path ? `${first.path} — ` : ""}${first.message}` : "Request validation failed.",
          { target: result.target, issues },
        );
        return c.json(errorBody(err, c.get("requestId")), 400);
      }
    },
  });

  v1.openAPIRegistry.registerComponent("securitySchemes", "ApiKey", {
    type: "http",
    scheme: "bearer",
    description: "API key issued from Admin → API keys (`Authorization: Bearer bg_live_…`). Scope `agent` for the voice assistant, `staff`/`admin` for back-office automation.",
  });
  v1.openAPIRegistry.registerComponent("securitySchemes", "AdminSession", {
    type: "apiKey",
    in: "cookie",
    name: "bg_admin_session",
    description: "Session cookie set by POST /admin/auth/login (browser admin UI).",
  });
  v1.openAPIRegistry.registerComponent("securitySchemes", "CustomerPhone", {
    type: "apiKey",
    in: "header",
    name: "X-Customer-Phone",
    description: "Phone number used for the booking/order. Verifies access to that customer record.",
  });
  v1.openAPIRegistry.registerComponent("securitySchemes", "AccessToken", {
    type: "apiKey",
    in: "header",
    name: "X-Access-Token",
    description: "Access token returned when the record was created.",
  });

  registerInfoRoutes(v1);
  registerMenuRoutes(v1);
  registerReservationRoutes(v1);
  registerOrderRoutes(v1);
  registerBulkRoutes(v1);
  registerKnowledgeRoutes(v1);
  registerAdminRoutes(v1);

  v1.doc31("/openapi.json", (c) => openApiConfig(new URL(c.req.url).origin));
  v1.get("/docs", swaggerUI({ url: "/api/v1/openapi.json", title: "Bayt Al Ghaf API" }));
  return v1;
}

export function openApiConfig(origin?: string) {
  const base = origin ?? getConfig().APP_BASE_URL;
  return {
    openapi: "3.1.0",
    info: {
      title: "Bayt Al Ghaf Restaurant API",
      version: API_VERSION,
      description: [
        "REST API of **Bayt Al Ghaf**, a *fictional* Emirati restaurant in Al Seef, Dubai, built as a realistic test environment for an external AI voice assistant.",
        "",
        "- Public restaurant information, menu, availability, knowledge base and FAQ need no authentication.",
        "- Creating orders and reservations is open to the website, but external agents should send an API key (`Authorization: Bearer …`, scope `agent`) for higher rate limits and the `phone` channel.",
        "- Reading or changing a customer's order/reservation requires verification: `X-Customer-Phone` (the number used) or `X-Access-Token` (returned at creation). Staff keys/sessions bypass this.",
        "- `/admin/*` requires a staff or admin API key or session.",
        "- Every response carries `X-Request-Id`. Errors use `{ error: { code, message, status, category, retryable, requestId, details } }`; branch on `code`.",
        "- Send `Idempotency-Key` on POST create calls; retries with the same key and body return the original response.",
        "- All local dates/times are Dubai time (Asia/Dubai, UTC+04:00). Money is integer fils plus a formatted AED string.",
        "",
        "Integration guide: docs/integration/external-agent-integration.md",
      ].join("\n"),
      contact: { name: "Bayt Al Ghaf test environment", email: "hello@baytalghaf.example" },
    },
    servers: [{ url: `${base}/api/v1`, description: "This deployment" }],
    tags: [
      { name: "Restaurant", description: "Identity, hours, location, transportation, policies, delivery zones" },
      { name: "Menu", description: "Menu, items, availability, specials, ingredients and sauces" },
      { name: "Reservations", description: "Table availability and bookings" },
      { name: "Orders", description: "Pickup, delivery and dine-in pre-orders" },
      { name: "Catering", description: "Bulk / catering quotes and orders" },
      { name: "Knowledge", description: "Knowledge documents, search, FAQ and agent test scenarios" },
      { name: "Admin", description: "Authenticated back-office operations" },
      { name: "System", description: "Health" },
    ],
  };
}

export function createApp() {
  const cfg = getConfig();
  const app = new OpenAPIHono<AppEnv>();

  app.use("*", async (c, next) => {
    const started = performance.now();
    const incoming = c.req.header("x-request-id");
    const requestId = incoming && /^[A-Za-z0-9._:-]{8,80}$/.test(incoming) ? incoming : newRequestId();
    c.set("requestId", requestId);
    c.set("now", resolveNow(c.req.header("x-test-now")));
    c.set("clientIp", clientIp(c.req.raw.headers, cfg.TRUST_PROXY));
    c.set("principal", { kind: "anonymous" });
    c.header("X-Request-Id", requestId);
    c.header("X-API-Version", API_VERSION);
    c.header("Cache-Control", "no-store");
    try {
      c.set("principal", await resolvePrincipal(c.req.raw.headers));
      await next();
    } finally {
      const p = c.get("principal");
      logger.info("http.request", {
        requestId,
        method: c.req.method,
        path: new URL(c.req.url).pathname,
        status: c.res.status,
        durationMs: Math.round(performance.now() - started),
        client: p.kind === "api_key" ? `key:${p.name}` : p.kind === "session" ? `staff:${p.role}` : "anonymous",
        ip: c.get("clientIp"),
      });
    }
  });

  app.use(
    "*",
    cors({
      origin: (origin) => (origin && cfg.corsOrigins.includes(origin) ? origin : null),
      allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization", "X-API-Key", "Idempotency-Key", "X-Customer-Phone", "X-Access-Token", "X-Request-Id"],
      exposeHeaders: ["X-Request-Id", "RateLimit-Limit", "RateLimit-Remaining", "RateLimit-Reset", "Retry-After", "Idempotent-Replayed"],
      maxAge: 600,
      credentials: false,
    }),
  );

  app.use(
    "*",
    bodyLimit({
      maxSize: MAX_BODY_BYTES,
      onError: () => {
        throw new ApiError("PAYLOAD_TOO_LARGE", `Request bodies are limited to ${MAX_BODY_BYTES / 1024} KB.`);
      },
    }),
  );

  // Browser (cookie) sessions must come from our own origin for state-changing requests (CSRF guard).
  app.use("*", async (c, next) => {
    const p = c.get("principal");
    if (p.kind === "session" && !["GET", "HEAD", "OPTIONS"].includes(c.req.method)) {
      const origin = c.req.header("origin");
      const self = new URL(c.req.url).origin;
      const allowed = [self, cfg.APP_BASE_URL, ...cfg.corsOrigins];
      if (origin && !allowed.includes(origin)) throw new ApiError("FORBIDDEN", "Cross-site request rejected.");
    }
    await next();
  });

  const health = async () => {
    let database = "ok";
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      database = "unavailable";
    }
    return { status: database === "ok" ? "ok" : "degraded", database, version: API_VERSION, time: new Date().toISOString() };
  };
  app.get("/api/health", async (c) => {
    const h = await health();
    return c.json(h, h.status === "ok" ? 200 : 503);
  });

  app.route("/api/v1", createV1());

  app.notFound((c) => c.json(errorBody(new ApiError("ROUTE_NOT_FOUND", `No route for ${c.req.method} ${new URL(c.req.url).pathname}.`), c.get("requestId") ?? newRequestId()), 404));

  app.onError((err, c) => {
    const requestId = c.get("requestId") ?? newRequestId();
    let apiErr: ApiError;
    if (isApiError(err)) apiErr = err;
    else if (err instanceof HTTPException) {
      apiErr =
        err.status === 413
          ? new ApiError("PAYLOAD_TOO_LARGE")
          : err.status === 400
            ? new ApiError("INVALID_JSON", "The request body is not valid JSON.")
            : new ApiError(err.status === 401 ? "AUTHENTICATION_REQUIRED" : "INTERNAL_ERROR", err.message);
    } else if (err instanceof Prisma.PrismaClientInitializationError || (err instanceof Prisma.PrismaClientKnownRequestError && ["P1001", "P1002", "P1017", "P2024"].includes(err.code))) {
      apiErr = new ApiError("SERVICE_UNAVAILABLE", "The database is temporarily unavailable. Nothing was changed.");
    } else if (err instanceof SyntaxError) {
      apiErr = new ApiError("INVALID_JSON", "The request body is not valid JSON.");
    } else {
      apiErr = new ApiError("INTERNAL_ERROR", "Unexpected server error. Nothing should be assumed to have happened.");
    }
    if (apiErr.status >= 500) {
      logger.error("http.error", { requestId, code: apiErr.code, error: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : undefined });
    }
    if (apiErr.code === "RATE_LIMITED" || apiErr.code === "TOO_MANY_VERIFICATION_ATTEMPTS") {
      c.header("Retry-After", String((apiErr.details?.retryAfterSeconds as number | undefined) ?? 900));
    }
    return c.json(errorBody(apiErr, requestId), apiErr.status as 400);
  });

  return app;
}

let singleton: ReturnType<typeof createApp> | null = null;
export function getApp() {
  singleton ??= createApp();
  return singleton;
}

export { ERROR_CATALOG };
