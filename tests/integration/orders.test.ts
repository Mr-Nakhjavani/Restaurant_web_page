import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { AGENT_KEY, apiKey, bearer, call, customer, MONDAY_10 } from "./helpers";
import { clearTransactions } from "./db-reset";

beforeAll(clearTransactions);

const order = (body: Record<string, unknown>, opts: { headers?: Record<string, string>; now?: string } = {}) =>
  call("POST", "/orders", { body, now: opts.now ?? MONDAY_10, headers: opts.headers });
const pickup = (date: string, time: string) => ({ type: "pickup", date, time });

describe("orders", () => {
  it("places a pickup order with server-side prices, ignoring any client price fields", async () => {
    const r = await order(
      {
        items: [
          { itemId: "mi_lamb_machboos", quantity: 2, options: ["portion_large"], unitPriceFils: 1 },
          { itemId: "karak", quantity: 2, options: ["milk_camel"] },
        ],
        fulfilment: pickup("2026-10-26", "13:00"),
        customer: customer(1),
        totalFils: 5,
      },
      { headers: bearer(AGENT_KEY) },
    );
    expect(r.status).toBe(201);
    const o = r.body.data.order;
    expect(o.number).toMatch(/^ORD-\d{6}$/);
    expect(o).toMatchObject({ status: "confirmed", confirmed: true, type: "pickup", channel: "phone", deliveryAddress: null });
    expect(o.totals.subtotal.amountFils).toBe(2 * (7200 + 1800) + 2 * (1200 + 400));
    expect(o.totals.total.amountFils).toBe(o.totals.subtotal.amountFils);
    expect(o.totals.vatIncluded.amountFils).toBe(Math.round((o.totals.total.amountFils * 5) / 105));
    expect(o.fulfilment).toMatchObject({ date: "2026-10-26", time: "13:00" });
    expect(r.body.data.message).toMatch(/confirmed/);
    const db = await prisma.order.findUniqueOrThrow({ where: { number: o.number }, include: { items: true } });
    expect(db.items).toHaveLength(2);
  });

  it("quotes before ordering, with earliest times and per-line availability", async () => {
    const q = await call("POST", "/orders/quote", { body: { items: [{ itemId: "mi_hammour_mashwi", quantity: 1 }], fulfilment: { type: "pickup", asap: true } }, now: MONDAY_10 });
    expect(q.status).toBe(200);
    expect(q.body.data.valid).toBe(true);
    expect(q.body.data.fulfilment.leadTimeMinutes).toBe(30);
    expect(q.body.data.fulfilment.accepted.time).toBe("12:00"); // hammour is served from 12:00
    expect(q.body.data.lines[0].allergens).toEqual(["fish"]);
  });

  it("validates customer details", async () => {
    const missing = await call("POST", "/orders", { body: { items: [{ itemId: "mi_karak", quantity: 1 }], fulfilment: pickup("2026-10-26", "13:00") }, now: MONDAY_10 });
    expect(missing.status).toBe(400);
    expect(missing.body.error.code).toBe("VALIDATION_ERROR");
    const badPhone = await order({ items: [{ itemId: "mi_karak", quantity: 1 }], fulfilment: pickup("2026-10-26", "13:00"), customer: { name: "Guest", phone: "0501" } });
    expect(badPhone.status).toBe(400);
    const invalidPhone = await order({ items: [{ itemId: "mi_karak", quantity: 1 }], fulfilment: pickup("2026-10-26", "13:00"), customer: { name: "Guest", phone: "999 999 9999" } });
    expect(invalidPhone.body.error.code).toBe("INVALID_PHONE");
  });

  it("requires an address for delivery but never for pickup", async () => {
    const noAddress = await order({ items: [{ itemId: "mi_chicken_machboos", quantity: 2 }], fulfilment: { type: "delivery", date: "2026-10-26", time: "19:00" }, customer: customer(2) });
    expect(noAddress.status).toBe(422);
    expect(noAddress.body.error.code).toBe("DELIVERY_ADDRESS_REQUIRED");
    const abuDhabi = await order({ items: [{ itemId: "mi_chicken_machboos", quantity: 2 }], fulfilment: { type: "delivery", date: "2026-10-26", time: "19:00" }, deliveryAddress: { area: "Abu Dhabi", building: "Tower 1", street: "Corniche" }, customer: customer(2) });
    expect(abuDhabi.body.error.code).toBe("DELIVERY_AREA_NOT_SERVED");
    const marina = await order({ items: [{ itemId: "mi_chicken_machboos", quantity: 2 }], fulfilment: { type: "delivery", date: "2026-10-26", time: "19:00" }, deliveryAddress: { area: "Dubai Marina", building: "Tower 1", street: "Marina Walk" }, customer: customer(2) });
    expect(marina.body.error.code).toBe("DELIVERY_ZONE_CATERING_ONLY");
    const small = await order({ items: [{ itemId: "mi_karak", quantity: 1 }], fulfilment: { type: "delivery", date: "2026-10-26", time: "19:00" }, deliveryAddress: { area: "Downtown Dubai", building: "Boulevard Plaza", street: "Sheikh Mohammed bin Rashid Blvd" }, customer: customer(2) });
    expect(small.body.error.code).toBe("BELOW_DELIVERY_MINIMUM");
    const intl = await order({ items: [{ itemId: "mi_chicken_machboos", quantity: 2 }], fulfilment: { type: "delivery", date: "2026-10-26", time: "19:00" }, deliveryAddress: { area: "Al Karama", building: "Al Attar Tower", street: "Sheikh Khalifa St" }, customer: { name: "Tourist", phone: "+44 7911 123456" } });
    expect(intl.body.error.code).toBe("DELIVERY_REQUIRES_UAE_MOBILE");
    const ok = await order({ items: [{ itemId: "mi_chicken_machboos", quantity: 2 }], fulfilment: { type: "delivery", date: "2026-10-26", time: "19:00" }, deliveryAddress: { area: "Karama", building: "Al Attar Tower", street: "Sheikh Khalifa St", unit: "1204" }, customer: customer(2) });
    expect(ok.status).toBe(201);
    expect(ok.body.data.order).toMatchObject({ type: "delivery", deliveryZone: "zone_b", totals: { deliveryFee: { amountFils: 1200 } } });
    expect(ok.body.data.order.fulfilment.estimatedWindow).toEqual({ from: "19:00", to: "19:15" });
    const pick = await order({ items: [{ itemId: "mi_karak", quantity: 1 }], fulfilment: pickup("2026-10-26", "13:15"), customer: customer(3) });
    expect(pick.status).toBe(201);
  });

  it("rejects invalid quantities, customisations and catering-only dishes", async () => {
    const qty = await order({ items: [{ itemId: "mi_karak", quantity: 11 }], fulfilment: pickup("2026-10-26", "13:00"), customer: customer(4) });
    expect(qty.body.error.code).toBe("INVALID_QUANTITY");
    const opt = await order({ items: [{ itemId: "mi_karak", quantity: 1, options: ["gold_leaf"] }], fulfilment: pickup("2026-10-26", "13:00"), customer: customer(4) });
    expect(opt.body.error.code).toBe("INVALID_CUSTOMIZATION");
    expect(opt.body.error.details.availableOptions.length).toBeGreaterThan(0);
    const unknown = await order({ items: [{ itemId: "mi_sushi", quantity: 1 }], fulfilment: pickup("2026-10-26", "13:00"), customer: customer(4) });
    expect(unknown.body.error.code).toBe("UNKNOWN_MENU_ITEM");
    const ouzi = await order({ items: [{ itemId: "mi_whole_lamb_ouzi", quantity: 1 }], fulfilment: pickup("2026-10-28", "13:00"), customer: customer(4) });
    expect(ouzi.body.error.code).toBe("BULK_ONLY_ITEM");
    const huge = await order({ items: Array.from({ length: 3 }, () => ({ itemId: "mi_chicken_machboos", quantity: 8 })), fulfilment: pickup("2026-10-27", "13:00"), customer: customer(4) });
    expect(huge.body.error.code).toBe("REQUIRES_BULK_ORDER");
  });

  it("refuses unavailable special-day dishes with the next date and alternatives", async () => {
    const r = await order({ items: [{ itemId: "mi_friday_platter", quantity: 1 }], fulfilment: pickup("2026-10-27", "13:00"), customer: customer(5) });
    expect(r.status).toBe(422);
    expect(r.body.error.code).toBe("ITEM_UNAVAILABLE");
    expect(r.body.error.details.items[0]).toMatchObject({ itemId: "mi_friday_platter", reasons: ["NOT_AVAILABLE_ON_DAY"], nextAvailable: { date: "2026-10-30" } });
    expect(r.body.error.details.items[0].alternatives.length).toBeGreaterThan(0);
    const breakfastAtLunch = await order({ items: [{ itemId: "mi_balaleet", quantity: 1 }], fulfilment: pickup("2026-10-26", "13:00"), customer: customer(5) });
    expect(breakfastAtLunch.body.error.code).toBe("ITEM_UNAVAILABLE");
    const friday = await order({ items: [{ itemId: "mi_friday_platter", quantity: 1 }], fulfilment: pickup("2026-10-30", "13:00"), customer: customer(5) });
    expect(friday.status).toBe(201);
  });

  it("rejects pickup times the kitchen cannot meet, never confirming them", async () => {
    const soon = await order({ items: [{ itemId: "mi_hammour_mashwi", quantity: 1 }], fulfilment: pickup("2026-10-26", "12:00") , customer: customer(6) }, { now: "2026-10-26T11:45:00+04:00" });
    expect(soon.body.error.code).toBe("TIME_TOO_SOON");
    expect(soon.body.error.details.alternatives[0].time).toBe("12:15");
    const night = await order({ items: [{ itemId: "mi_karak", quantity: 1 }], fulfilment: pickup("2026-10-26", "23:30"), customer: customer(6) });
    expect(night.body.error.code).toBe("OUTSIDE_ORDERING_HOURS");
    const odd = await order({ items: [{ itemId: "mi_karak", quantity: 1 }], fulfilment: pickup("2026-10-26", "13:07"), customer: customer(6) });
    expect(odd.status).toBe(422);
    expect(odd.body.error.code).toBe("INVALID_TIME");
    const month = await order({ items: [{ itemId: "mi_karak", quantity: 1 }], fulfilment: pickup("2026-11-26", "13:00"), customer: customer(6) });
    expect(month.body.error.code).toBe("TOO_FAR_IN_ADVANCE");
  });

  it("enforces kitchen slot capacity and offers neighbouring slots", async () => {
    for (let i = 0; i < 3; i++) {
      const r = await order({ items: [{ itemId: "mi_chicken_machboos", quantity: 10 }], fulfilment: pickup("2026-10-27", "19:00"), customer: customer(70 + i) });
      if (i < 3) expect(r.status, JSON.stringify(r.body)).toBe(i < 3 ? 201 : 409);
    }
    const full = await order({ items: [{ itemId: "mi_chicken_machboos", quantity: 2 }], fulfilment: pickup("2026-10-27", "19:00"), customer: customer(80) });
    expect(full.status).toBe(409);
    expect(full.body.error.code).toBe("SLOT_FULL");
    expect(full.body.error.details.alternatives.map((a: { time: string }) => a.time)).toEqual(expect.arrayContaining(["18:45", "19:15"]));
  });

  it("enforces daily limits (harees)", async () => {
    for (let i = 0; i < 5; i++) {
      const r = await order({ items: [{ itemId: "mi_harees", quantity: 6 }], fulfilment: pickup("2026-10-28", `${12 + i}:00`), customer: customer(90 + i) });
      expect(r.status).toBe(201);
    }
    const sixth = await order({ items: [{ itemId: "mi_harees", quantity: 1 }], fulfilment: pickup("2026-10-28", "18:00"), customer: customer(99) });
    expect(sixth.body.error.code).toBe("ITEM_UNAVAILABLE");
    expect(sixth.body.error.details.items[0].reasons).toContain("DAILY_LIMIT_REACHED");
  });

  it("deduplicates retries with an Idempotency-Key and blocks accidental duplicates", async () => {
    const body = { items: [{ itemId: "mi_luqaimat", quantity: 1 }], fulfilment: pickup("2026-10-26", "15:00"), customer: customer(10) };
    const a = await order(body, { headers: { "idempotency-key": "order-retry-0001" } });
    const b = await order(body, { headers: { "idempotency-key": "order-retry-0001" } });
    expect(b.headers.get("idempotent-replayed")).toBe("true");
    expect(b.body.data.order.number).toBe(a.body.data.order.number);
    expect(await prisma.order.count({ where: { phone: "+971501001010" } })).toBe(1);
    const dup = await order(body);
    expect(dup.status).toBe(409);
    expect(dup.body.error).toMatchObject({ code: "DUPLICATE_ORDER", details: { existingOrderNumber: a.body.data.order.number } });
  });

  it("holds large-value orders for manual confirmation", async () => {
    const r = await order({ items: [{ itemId: "mi_lamb_chops", quantity: 8 }, { itemId: "mi_rubyan_mashwi", quantity: 8 }], fulfilment: pickup("2026-10-29", "20:00"), customer: customer(11) });
    expect(r.status).toBe(201);
    expect(r.body.data.order).toMatchObject({ status: "pending_confirmation", confirmed: false, requiresReview: true });
    expect(r.body.data.message).toMatch(/NOT yet confirmed/);
  });

  it("modifies an order with full re-validation and leaves it unchanged on failure", async () => {
    const r = await order({ items: [{ itemId: "mi_chicken_machboos", quantity: 2 }], fulfilment: pickup("2026-10-31", "13:00"), customer: customer(12) });
    const n = r.body.data.order.number;
    const h = { "x-customer-phone": customer(12).phone };
    const more = await call("PATCH", `/orders/${n}`, { body: { items: [{ itemId: "mi_chicken_machboos", quantity: 3 }], fulfilment: { time: "13:30" } }, headers: h, now: MONDAY_10 });
    expect(more.status).toBe(200);
    expect(more.body.data.order.totals.total.amountFils).toBe(3 * 5800);
    expect(more.body.data.order.fulfilment.time).toBe("13:30");
    const fifty = await call("PATCH", `/orders/${n}`, { body: { items: [{ itemId: "mi_chicken_machboos", quantity: 10 }, { itemId: "mi_lamb_machboos", quantity: 10 }, { itemId: "mi_vegetable_machboos", quantity: 10 }] }, headers: h, now: MONDAY_10 });
    expect(fifty.body.error.code).toBe("REQUIRES_BULK_ORDER");
    expect(fifty.body.error.details.unchanged).toBe(true);
    const still = await call("GET", `/orders/${n}`, { headers: h, now: MONDAY_10 });
    expect(still.body.data.items[0].quantity).toBe(3);
    const late = await call("PATCH", `/orders/${n}`, { body: { specialInstructions: "Extra napkins" }, headers: h, now: "2026-10-31T13:10:00+04:00" });
    expect(late.body.error.code).toBe("MODIFICATION_WINDOW_CLOSED");
  });

  it("cancels before preparation and refuses after, with status transitions by staff", async () => {
    const a = await order({ items: [{ itemId: "mi_saloona_dajaj", quantity: 1 }], fulfilment: pickup("2026-11-01", "13:00"), customer: customer(13) });
    const h = { "x-access-token": a.body.data.accessToken };
    const cancelled = await call("POST", `/orders/${a.body.data.order.number}/cancel`, { body: { reason: "Changed my mind" }, headers: h, now: MONDAY_10 });
    expect(cancelled.body.data.order.status).toBe("cancelled");
    const b = await order({ items: [{ itemId: "mi_saloona_dajaj", quantity: 1 }], fulfilment: pickup("2026-11-01", "14:00"), customer: customer(14) });
    const nb = b.body.data.order.number;
    const tooLate = await call("POST", `/orders/${nb}/cancel`, { body: {}, headers: { "x-access-token": b.body.data.accessToken }, now: "2026-11-01T13:40:00+04:00" });
    expect(tooLate.body.error.code).toBe("CANCELLATION_WINDOW_CLOSED");
    const staff = bearer(await apiKey(["staff"]));
    for (const s of ["preparing", "ready_for_pickup", "completed"]) {
      const t = await call("POST", `/admin/orders/${nb}/status`, { body: { status: s }, headers: staff, now: MONDAY_10 });
      expect(t.body.data.status).toBe(s);
    }
    const bad = await call("POST", `/admin/orders/${nb}/status`, { body: { status: "preparing" }, headers: staff });
    expect(bad.body.error.code).toBe("INVALID_STATUS_TRANSITION");
    const status = await call("GET", `/orders/${nb}/status`, { headers: { "x-customer-phone": customer(14).phone } });
    expect(status.body.data).toMatchObject({ status: "completed", isFinal: true });
  });

  it("removes a line that became unavailable after ordering and re-totals", async () => {
    const r = await order({ items: [{ itemId: "mi_hammour_mashwi", quantity: 1 }, { itemId: "mi_karak", quantity: 1 }], fulfilment: pickup("2026-11-01", "19:00"), customer: customer(15) });
    const o = r.body.data.order;
    const staff = bearer(await apiKey(["staff"]));
    const line = o.items.find((i: { itemId: string }) => i.itemId === "mi_hammour_mashwi");
    const u = await call("POST", `/admin/orders/${o.number}/lines/${line.id}/remove`, { body: { reason: "Hammour sold out" }, headers: staff, now: MONDAY_10 });
    expect(u.body.data.totals.total.amountFils).toBe(1200);
    expect(u.body.data.items.find((i: { itemId: string }) => i.itemId === "mi_hammour_mashwi").status).toBe("removed");
  });

  it("links dine-in pre-orders to a confirmed reservation with the same phone", async () => {
    const res = await call("POST", "/reservations", { body: { date: "2026-11-02", time: "20:00", partySize: 4, customer: customer(16) }, now: MONDAY_10 });
    const ref = res.body.data.reservation.reference;
    const noRef = await order({ items: [{ itemId: "mi_majlis_platter", quantity: 1 }], fulfilment: { type: "dine_in_preorder" }, customer: customer(16) });
    expect(noRef.body.error.code).toBe("RESERVATION_REQUIRED_FOR_PREORDER");
    const wrongPhone = await order({ items: [{ itemId: "mi_majlis_platter", quantity: 1 }], fulfilment: { type: "dine_in_preorder", reservationReference: ref }, customer: customer(17) });
    expect(wrongPhone.body.error.code).toBe("RESERVATION_MISMATCH");
    const ok = await order({ items: [{ itemId: "mi_majlis_platter", quantity: 1 }], fulfilment: { type: "dine_in_preorder", reservationReference: ref }, customer: customer(16) });
    expect(ok.status).toBe(201);
    expect(ok.body.data.order).toMatchObject({ reservationReference: ref, fulfilment: { date: "2026-11-02", time: "20:00" }, payment: { method: "pay_at_table" } });
    const cancelRes = await call("POST", `/reservations/${ref}/cancel`, { body: {}, headers: { "x-customer-phone": customer(16).phone }, now: MONDAY_10 });
    expect(cancelRes.body.data.reservation.preOrders[0].status).toBe("cancelled");
  });

  it("flags allergy notes for a call-back", async () => {
    const r = await order({ items: [{ itemId: "mi_luqaimat", quantity: 1, options: ["sesame_no"] }], fulfilment: pickup("2026-10-26", "16:00"), customer: customer(18), specialInstructions: "Severe sesame allergy" });
    expect(r.body.data.order.allergyNoteFlagged).toBe(true);
  });
});
