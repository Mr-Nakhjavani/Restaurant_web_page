import { beforeAll, describe, expect, it } from "vitest";
import { call, customer, MONDAY_10 } from "./helpers";
import { clearTransactions } from "./db-reset";

beforeAll(clearTransactions);

const quote = (body: Record<string, unknown>, now = MONDAY_10) => call("POST", "/bulk-orders/quotes", { body, now });

describe("catering / bulk orders", () => {
  it("quotes 40 office lunches two days ahead as feasible and turns the quote into a pending order", async () => {
    const q = await quote({ items: [{ itemId: "mi_office_lunch_box", quantity: 30 }, { itemId: "mi_office_lunch_box", quantity: 10, options: ["main_vegetable"] }], fulfilment: { type: "delivery", date: "2026-10-28", time: "12:30" }, deliveryArea: "Business Bay", guestCount: 40 });
    expect(q.status).toBe(200);
    expect(q.body.data).toMatchObject({ status: "feasible", feasible: true, portions: 40, leadTime: { requiredHours: 24 } });
    expect(q.body.data.quoteId).toMatch(/^QTE-\d{6}$/);
    expect(q.body.data.totals.total.amountFils).toBe(30 * 4500 + 10 * 4000 + 1800);
    const o = await call("POST", "/bulk-orders", {
      body: { quoteId: q.body.data.quoteId, customer: customer(1), companyName: "Test Co", deliveryAddress: { area: "Business Bay", building: "Bay Square 7", street: "Bay Square" } },
      now: MONDAY_10,
    });
    expect(o.status).toBe(201);
    expect(o.body.data.order).toMatchObject({ kind: "bulk", status: "pending_confirmation", confirmed: false, catering: { guestCount: 40 } });
    expect(o.body.data.order.number).toMatch(/^CAT-\d{6}$/);
    expect(o.body.data.message).toMatch(/NOT confirmed/);
    const reuse = await call("POST", "/bulk-orders", { body: { quoteId: q.body.data.quoteId, customer: customer(2), deliveryAddress: { area: "Business Bay", building: "x", street: "y" } }, now: MONDAY_10 });
    expect(reuse.body.error.code).toBe("QUOTE_ALREADY_USED");
  });

  it("requires 48 hours' notice for 100 portions and proposes feasible dates", async () => {
    const q = await quote({ items: [{ itemId: "mi_lamb_machboos", quantity: 100 }], fulfilment: { type: "pickup", date: "2026-10-27", time: "13:00" } });
    expect(q.body.data.status).toBe("needs_changes");
    expect(q.body.data.issues.map((i: { code: string }) => i.code)).toEqual(["INSUFFICIENT_NOTICE"]);
    expect(q.body.data.leadTime.requiredHours).toBe(48);
    expect(q.body.data.alternatives[0].date >= "2026-10-28").toBe(true);
    expect(q.body.data.totals.discountPercent).toBe(5);
    const notFeasible = await call("POST", "/bulk-orders", { body: { quoteId: q.body.data.quoteId, customer: customer(3) }, now: MONDAY_10 });
    expect(notFeasible.body.error.code).toBe("QUOTE_NOT_FEASIBLE");
  });

  it("refuses 200 machboos in 20 minutes and escalates", async () => {
    const q = await quote({ items: [{ itemId: "mi_lamb_machboos", quantity: 200 }], fulfilment: { type: "pickup", date: "2026-10-26", time: "10:30" } }, "2026-10-26T10:10:00+04:00");
    expect(q.body.data.status).toBe("not_possible");
    expect(q.body.data.issues.map((i: { code: string }) => i.code)).toEqual(expect.arrayContaining(["ITEM_DAILY_MAXIMUM_EXCEEDED", "INSUFFICIENT_NOTICE"]));
    expect(q.body.data.escalation.contact).toMatch(/events@/);
  });

  it("refuses quantities above the per-order maximum", async () => {
    const q = await quote({ items: [{ itemId: "mi_chicken_machboos", quantity: 200 }, { itemId: "mi_vegetable_machboos", quantity: 100 }], fulfilment: { type: "pickup", date: "2026-11-10", time: "13:00" } });
    expect(q.body.data.issues.map((i: { code: string }) => i.code)).toContain("EXCEEDS_MAX_BULK_PORTIONS");
    expect(q.body.data.status).toBe("not_possible");
  });

  it("tracks daily catering capacity across orders", async () => {
    const make = async (qty: number, n: number) => {
      const q = await quote({ items: [{ itemId: "mi_chicken_machboos", quantity: qty }], fulfilment: { type: "pickup", date: "2026-11-12", time: "13:00" } });
      if (!q.body.data.feasible) return q;
      return call("POST", "/bulk-orders", { body: { quoteId: q.body.data.quoteId, customer: customer(n) }, now: MONDAY_10 });
    };
    expect((await make(150, 10)).status).toBe(201);
    const full = await make(200, 11);
    expect(full.body.data.issues.map((i: { code: string }) => i.code)).toEqual(expect.arrayContaining(["DAILY_CAPACITY_EXCEEDED"]));
    expect(full.body.data.alternatives.length).toBeGreaterThan(0);
  });

  it("needs 48 hours for a whole lamb ouzi and limits it to 3 per day", async () => {
    const tomorrow = await quote({ items: [{ itemId: "mi_whole_lamb_ouzi", quantity: 1 }], fulfilment: { type: "pickup", date: "2026-10-27", time: "13:00" } });
    expect(tomorrow.body.data.issues[0].code).toBe("INSUFFICIENT_NOTICE");
    const four = await quote({ items: [{ itemId: "mi_whole_lamb_ouzi", quantity: 4 }], fulfilment: { type: "pickup", date: "2026-11-05", time: "13:00" } });
    expect(four.body.data.issues.map((i: { code: string }) => i.code)).toContain("ITEM_DAILY_MAXIMUM_EXCEEDED");
  });

  it("expires quotes after 48 hours", async () => {
    const q = await quote({ items: [{ itemId: "mi_sambousa_trio", quantity: 30 }], fulfilment: { type: "pickup", date: "2026-11-06", time: "13:00" } });
    expect(q.body.data.feasible).toBe(true);
    const later = await call("POST", "/bulk-orders", { body: { quoteId: q.body.data.quoteId, customer: customer(20) }, now: "2026-10-29T10:00:00+04:00" });
    expect(later.status).toBe(409);
    expect(later.body.error.code).toBe("QUOTE_EXPIRED");
    const fetched = await call("GET", `/bulk-orders/quotes/${q.body.data.quoteId}`);
    expect(fetched.body.data.quoteId).toBe(q.body.data.quoteId);
  });

  it("refuses dishes that are cooked to order", async () => {
    const q = await quote({ items: [{ itemId: "mi_hammour_mashwi", quantity: 25 }], fulfilment: { type: "pickup", date: "2026-11-06", time: "13:00" } });
    expect(q.body.data.issues[0]).toMatchObject({ code: "ITEM_NOT_BULK_ELIGIBLE", blocking: true });
  });
});
