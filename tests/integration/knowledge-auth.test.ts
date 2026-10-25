import { beforeAll, describe, expect, it } from "vitest";
import { generateOpenApi } from "@/server/api/openapi-doc";
import { AGENT_KEY, apiKey, bearer, call, customer, MONDAY_10, app } from "./helpers";
import { clearTransactions } from "./db-reset";
import { resetConfigCache } from "@/server/config";

beforeAll(clearTransactions);

describe("knowledge base API", () => {
  it("lists documents and returns JSON or Markdown", async () => {
    const list = await call("GET", "/knowledge/documents");
    expect(list.body.data.map((d: { id: string }) => d.id)).toEqual(expect.arrayContaining(["menu-catalog", "voice-agent-reference", "knowledge-index"]));
    const json = await call("GET", "/knowledge/documents/reservations-and-seating");
    expect(json.body.data.sections.length).toBeGreaterThan(5);
    const md = await app.request("/api/v1/knowledge/documents/faq?format=markdown");
    expect(md.headers.get("content-type")).toMatch(/text\/markdown/);
    expect(await md.text()).toMatch(/^# Frequently Asked Questions/);
    expect((await call("GET", "/knowledge/documents/nope")).status).toBe(404);
  });

  it("searches documents and FAQ", async () => {
    const s = await call("GET", "/knowledge/search?q=is%20there%20parking");
    expect(s.body.data[0].heading.toLowerCase()).toContain("parking");
    const f = await call("GET", "/faq/search?q=allergic%20to%20sesame%20house%20sauce");
    expect(f.body.data[0].answer).toMatch(/Which house sauce/);
    const all = await call("GET", "/faq?category=Reservations");
    expect(all.body.data.every((x: { category: string }) => x.category === "Reservations")).toBe(true);
    expect((await call("GET", "/knowledge/scenarios")).body.data.length).toBeGreaterThanOrEqual(15);
  });
});

describe("authentication and authorisation", () => {
  it("protects admin endpoints", async () => {
    expect((await call("GET", "/admin/orders")).status).toBe(401);
    expect((await call("GET", "/admin/orders", { headers: bearer(AGENT_KEY) })).status).toBe(403);
    const staff = bearer(await apiKey(["staff"]));
    expect((await call("GET", "/admin/orders", { headers: staff })).status).toBe(200);
    const forbidden = await call("PATCH", "/admin/settings", { body: { announcement: "x" }, headers: staff });
    expect(forbidden.status).toBe(403);
    const priceByStaff = await call("PATCH", "/admin/menu/items/mi_karak", { body: { priceFils: 100 }, headers: staff });
    expect(priceByStaff.status).toBe(403);
    expect((await call("GET", "/admin/orders", { headers: bearer("bg_live_not_a_real_key") })).body.error.code).toBe("INVALID_API_KEY");
  });

  it("logs in with a session cookie and rejects bad credentials and cross-site mutations", async () => {
    const bad = await call("POST", "/admin/auth/login", { body: { email: "admin@baytalghaf.example", password: "wrong" } });
    expect(bad.status).toBe(401);
    expect(bad.body.error.code).toBe("INVALID_CREDENTIALS");
    const ok = await call("POST", "/admin/auth/login", { body: { email: "admin@baytalghaf.example", password: "Test-Admin-Password-1" } });
    expect(ok.status).toBe(200);
    const cookie = ok.headers.get("set-cookie")!.split(";")[0];
    expect(ok.headers.get("set-cookie")).toMatch(/HttpOnly/);
    const me = await call("GET", "/admin/auth/me", { headers: { cookie } });
    expect(me.body.data).toMatchObject({ kind: "session", role: "admin", isAdmin: true });
    const csrf = await call("PATCH", "/admin/settings", { body: { announcement: "hi" }, headers: { cookie, origin: "https://evil.example" } });
    expect(csrf.status).toBe(403);
    const same = await call("PATCH", "/admin/settings", { body: { announcement: null }, headers: { cookie, origin: "http://localhost:3000" } });
    expect(same.status).toBe(200);
  });

  it("validates settings changes and records an audit trail", async () => {
    const admin = bearer(await apiKey(["admin"]));
    const invalid = await call("PATCH", "/admin/settings", { body: { ordering: { slotMinutes: 3 } }, headers: admin });
    expect(invalid.status).toBe(400);
    const ok = await call("PATCH", "/admin/settings", { body: { reservations: { terraceOpen: false } }, headers: admin });
    expect(ok.body.data.settings.reservations.terraceOpen).toBe(false);
    const terrace = await call("POST", "/reservations", { body: { date: "2026-11-20", time: "19:00", partySize: 2, seatingPreference: "terrace", customer: customer(1) }, now: MONDAY_10 });
    expect(terrace.body.error.code).toBe("TERRACE_CLOSED");
    await call("PATCH", "/admin/settings", { body: { reservations: { terraceOpen: true } }, headers: admin });
    const log = await call("GET", "/admin/audit-log?entityType=settings", { headers: admin });
    expect(log.body.data.length).toBeGreaterThanOrEqual(2);
  });

  it("creates and revokes API keys (shown once)", async () => {
    const admin = bearer(await apiKey(["admin"]));
    const created = await call("POST", "/admin/api-keys", { body: { name: "Integration agent", scopes: ["agent"] }, headers: admin });
    expect(created.status).toBe(201);
    const key = created.body.data.key;
    expect((await call("GET", "/restaurant", { headers: bearer(key) })).status).toBe(200);
    await call("DELETE", `/admin/api-keys/${created.body.data.id}`, { headers: admin });
    expect((await call("GET", "/restaurant", { headers: bearer(key) })).body.error.code).toBe("INVALID_API_KEY");
    const list = await call("GET", "/admin/api-keys", { headers: admin });
    expect(JSON.stringify(list.body)).not.toContain(key);
  });

  it("locks a reference after repeated failed verification attempts", async () => {
    const r = await call("POST", "/orders", { body: { items: [{ itemId: "mi_karak", quantity: 1 }], fulfilment: { type: "pickup", date: "2026-10-26", time: "16:00" }, customer: customer(9) }, now: MONDAY_10 });
    const n = r.body.data.order.number;
    for (let i = 0; i < 5; i++) expect((await call("GET", `/orders/${n}`, { headers: { "x-customer-phone": "050 000 0000" } })).status).toBe(404);
    const locked = await call("GET", `/orders/${n}`, { headers: { "x-customer-phone": customer(9).phone } });
    expect(locked.status).toBe(429);
    expect(locked.body.error.code).toBe("TOO_MANY_VERIFICATION_ATTEMPTS");
  });
});

describe("errors, limits and CORS", () => {
  it("returns consistent machine-readable errors", async () => {
    const notFound = await call("GET", "/does-not-exist");
    expect(notFound.status).toBe(404);
    expect(notFound.body.error).toMatchObject({ code: "ROUTE_NOT_FOUND", category: "not_found" });
    const json = await call("POST", "/orders/quote", { raw: "{not json" });
    expect(json.status).toBe(400);
    expect(json.body.error.code).toBe("INVALID_JSON");
    const big = await call("POST", "/orders/quote", { raw: JSON.stringify({ pad: "x".repeat(70_000) }) });
    expect(big.status).toBe(413);
    expect(big.body.error.code).toBe("PAYLOAD_TOO_LARGE");
    const validation = await call("GET", "/reservations/availability?date=tomorrow&partySize=2");
    expect(validation.body.error).toMatchObject({ code: "VALIDATION_ERROR", details: { target: "query" } });
  });

  it("applies rate limits with standard headers when enabled", async () => {
    process.env.RATE_LIMIT_ENABLED = "true";
    resetConfigCache();
    let last = 0;
    let headers: Headers | null = null;
    for (let i = 0; i < 32; i++) {
      const r = await call("POST", "/orders", { body: {}, headers: { "x-forwarded-for": "203.0.113.9" } });
      last = r.status;
      headers = r.headers;
      if (r.status === 429) break;
    }
    expect(last).toBe(429);
    expect(headers!.get("retry-after")).toBeTruthy();
    process.env.RATE_LIMIT_ENABLED = "false";
    resetConfigCache();
  });

  it("allows CORS only for configured origins", async () => {
    const ok = await app.request("/api/v1/menu", { method: "OPTIONS", headers: { origin: "http://localhost:3000", "access-control-request-method": "GET" } });
    expect(ok.headers.get("access-control-allow-origin")).toBe("http://localhost:3000");
    const bad = await app.request("/api/v1/menu", { method: "OPTIONS", headers: { origin: "https://evil.example", "access-control-request-method": "GET" } });
    expect(bad.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("serves an OpenAPI 3.1 document covering the required endpoints", async () => {
    const r = await call("GET", "/openapi.json");
    expect(r.body.openapi).toBe("3.1.0");
    const paths = Object.keys(r.body.paths);
    for (const p of ["/restaurant", "/restaurant/hours", "/restaurant/location", "/restaurant/policies", "/restaurant/transportation", "/menu", "/menu/categories", "/menu/items/{id}", "/menu/items/{id}/availability", "/menu/specials", "/ingredients/{id}", "/sauces/{id}", "/reservations/availability", "/reservations", "/reservations/{reference}", "/reservations/{reference}/cancel", "/orders", "/orders/{number}", "/orders/{number}/status", "/orders/{number}/cancel", "/faq", "/faq/search", "/knowledge/search", "/knowledge/documents", "/knowledge/documents/{id}", "/bulk-orders/quotes", "/bulk-orders", "/health"]) {
      expect(paths, p).toContain(p);
    }
    expect(Object.keys(generateOpenApi().paths ?? {}).length).toBe(paths.length);
  });
});
