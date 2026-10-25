#!/usr/bin/env node
/**
 * Bayt Al Ghaf API — standalone usage examples for an external HTTP client (Node.js 18+, no dependencies).
 * These are API demonstrations only; they do not implement a conversational agent.
 *
 *   BASE_URL=http://localhost:3000/api/v1 API_KEY=bg_dev_agent_key_for_local_testing_only node node-client.mjs
 *
 * The script books and orders for a test customer, then cancels what it created.
 */
import { randomUUID } from "node:crypto";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000/api/v1";
const API_KEY = process.env.API_KEY ?? "";
const PHONE = process.env.CUSTOMER_PHONE ?? "050 555 0123";

class ApiError extends Error {
  constructor(status, body) {
    super(body?.error?.message ?? `HTTP ${status}`);
    this.status = status;
    this.code = body?.error?.code ?? "UNKNOWN";
    this.retryable = body?.error?.retryable ?? status >= 500;
    this.details = body?.error?.details ?? {};
    this.requestId = body?.error?.requestId;
  }
}

/** One call with timeout, one retry for retryable failures, and structured errors. */
async function api(method, path, { body, headers = {}, idempotencyKey, retries = 1 } = {}) {
  const h = { Accept: "application/json", ...headers };
  if (API_KEY) h.Authorization = `Bearer ${API_KEY}`;
  if (body !== undefined) h["Content-Type"] = "application/json";
  if (idempotencyKey) h["Idempotency-Key"] = idempotencyKey; // reuse the SAME key when retrying a create
  for (let attempt = 0; ; attempt++) {
    let res;
    try {
      res = await fetch(`${BASE_URL}${path}`, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(10_000) });
    } catch (e) {
      if (attempt < retries) continue; // network error: nothing is known to have happened
      throw new ApiError(0, { error: { code: "NETWORK_ERROR", message: e.message, retryable: true } });
    }
    const text = await res.text();
    const json = text ? JSON.parse(text) : null;
    if (res.ok) return json;
    const err = new ApiError(res.status, json);
    if (err.retryable && attempt < retries) {
      const wait = Number(res.headers.get("retry-after") ?? 1);
      await new Promise((r) => setTimeout(r, Math.min(wait, 5) * 1000));
      continue;
    }
    throw err;
  }
}

/** Next date (Dubai) that falls on an ISO weekday (1 = Monday … 7 = Sunday). */
function nextWeekday(iso, minDaysAhead = 1) {
  const now = new Date(Date.now() + 4 * 3600_000); // Dubai = UTC+4, no DST
  for (let i = minDaysAhead; i < minDaysAhead + 8; i++) {
    const d = new Date(now.getTime() + i * 86400_000);
    if (((d.getUTCDay() + 6) % 7) + 1 === iso) return d.toISOString().slice(0, 10);
  }
}
const log = (title, value) => console.log(`\n=== ${title}\n${typeof value === "string" ? value : JSON.stringify(value, null, 2)}`);

async function main() {
  // 1. Menu information
  const menu = await api("GET", "/menu?category=rice-and-machboos");
  log("1. Rice dishes", menu.data.map((i) => `${i.name} (${i.arabicName}) — ${i.price.formatted} — ${i.availability.orderable ? "available now" : i.availability.reasons[0]?.message}`).join("\n"));

  // 2. A dish's ingredients and allergens (search first, never guess ids)
  const found = await api("GET", "/menu/search?q=" + encodeURIComponent("rice with meat and dried lemon") + "&limit=1");
  const dish = (await api("GET", `/menu/items/${found.data[0].item.id}`)).data;
  log("2. Ingredients & allergens", {
    dish: dish.name,
    ingredients: dish.ingredients.map((i) => `${i.name}: ${i.quantity}`),
    contains: dish.allergenDetails.map((a) => `${a.label} (from ${a.sources.join("; ")})${a.avoidableWith ? ` — can be left out: ${a.avoidableWith.join(" + ")}` : ""}`),
    mayContain: dish.mayContain,
    kitchenStatement: dish.kitchenAllergenStatement,
  });

  // 3. Special-day availability on a given date
  const tuesday = nextWeekday(2);
  const friday = nextWeekday(5);
  for (const date of [tuesday, friday]) {
    const a = (await api("GET", `/menu/items/mi_friday_platter/availability?date=${date}&mode=pickup`)).data.availability;
    log(`3. Friday platter on ${date}`, a.orderable ? "Available" : `${a.reasons.map((r) => r.message).join(" ")} Next: ${a.nextAvailable?.date} ${a.nextAvailable?.time}`);
  }

  // 4. Find slots and book a table
  const date = nextWeekday(3, 2); // a Wednesday at least two days out
  const avail = (await api("GET", `/reservations/availability?date=${date}&partySize=4&time=19:30&seatingPreference=no_preference`)).data;
  const time = avail.requested?.available ? "19:30" : avail.alternatives[0]?.time;
  log("4a. Availability", { date, requested: avail.requested, alternatives: avail.alternatives.map((s) => s.time) });
  const booking = await api("POST", "/reservations", {
    idempotencyKey: `example-${randomUUID()}`,
    body: { date, time, partySize: 4, seatingPreference: "no_preference", customer: { name: "Example Guest", phone: PHONE } },
  });
  const res = booking.data.reservation;
  // Only now may the customer be told it is booked — and only "confirmed" means confirmed.
  log("4b. Booked", { reference: res.reference, status: res.status, confirmed: res.confirmed, message: booking.data.message });

  // 5. Takeaway order for a requested pickup time
  const quote = (await api("POST", "/orders/quote", { body: { items: [{ itemId: "mi_lamb_machboos", quantity: 2, options: ["hashu_no_raisins"] }, { itemId: "mi_karak", quantity: 2 }], fulfilment: { type: "pickup", date, time: "13:00" } } })).data;
  log("5a. Quote", { valid: quote.valid, total: quote.totals.total.formatted, accepted: quote.fulfilment.accepted, issues: quote.issues.map((i) => i.code) });
  const orderKey = `example-${randomUUID()}`;
  const order = await api("POST", "/orders", {
    idempotencyKey: orderKey,
    body: { items: [{ itemId: "mi_lamb_machboos", quantity: 2, options: ["hashu_no_raisins"] }, { itemId: "mi_karak", quantity: 2 }], fulfilment: { type: "pickup", date, time: "13:00" }, customer: { name: "Example Guest", phone: PHONE } },
  });
  log("5b. Order placed", { number: order.data.order.number, status: order.data.order.status, readyAt: order.data.order.fulfilment.promisedAt, message: order.data.message });

  // 6. Catering quote
  const cat = (await api("POST", "/bulk-orders/quotes", { body: { items: [{ itemId: "mi_office_lunch_box", quantity: 40 }], fulfilment: { type: "pickup", date: nextWeekday(4, 3), time: "12:30" }, guestCount: 40 } })).data;
  log("6. Catering quote", { quoteId: cat.quoteId, status: cat.status, total: cat.totals.total.formatted, notice: cat.leadTime, issues: cat.issues.map((i) => i.message), nextSteps: cat.nextSteps });

  // 7. Handling an unsuccessful request correctly
  try {
    await api("POST", "/orders", { idempotencyKey: `example-${randomUUID()}`, body: { items: [{ itemId: "mi_friday_platter", quantity: 1 }], fulfilment: { type: "pickup", date: tuesday, time: "13:00" }, customer: { name: "Example Guest", phone: PHONE } } });
  } catch (e) {
    if (!(e instanceof ApiError)) throw e;
    const item = e.details.items?.[0];
    log("7. Refused (expected)", {
      code: e.code, // branch on the code, not the message
      category: e.status === 422 ? "business rule — explain and offer alternatives" : e.status >= 500 ? "server — retry once, never confirm" : "check request",
      sayToCustomer: e.message,
      offer: item ? { nextAvailable: item.nextAvailable, alternatives: item.alternatives?.map((a) => a.name) } : null,
      requestId: e.requestId,
    });
  }

  // Clean up what this script created (verification with the phone used).
  await api("POST", `/orders/${order.data.order.number}/cancel`, { headers: { "X-Customer-Phone": PHONE }, body: { reason: "example script clean-up" } });
  await api("POST", `/reservations/${res.reference}/cancel`, { headers: { "X-Customer-Phone": PHONE }, body: { reason: "example script clean-up" } });
  log("Clean-up", "Example order and reservation cancelled.");
}

main().catch((e) => {
  console.error(`Failed: ${e.code ?? ""} ${e.message}`);
  process.exit(1);
});
