import { describe, expect, it } from "vitest";
import { bulkDiscountPercent, bulkIssuesFor, depositFor, feasibleAlternatives, requiredNoticeHours } from "@/domain/bulk-rules";
import { priceLines } from "@/domain/pricing";
import { checkPhone, maskPhone } from "@/domain/phone";
import { normaliseReference, generateReference, hashToken, tokenMatches } from "@/domain/references";
import { findDeliveryZone } from "@/domain/delivery";
import { cheapestCombinations } from "@/domain/feeding";
import { SearchIndex, tokenize } from "@/domain/search";
import { canTransitionOrder, canTransitionReservation, allowedOrderTransitions } from "@/domain/status";
import { formatAed, vatIncluded } from "@/domain/money";
import { catalog, ctx, dubai } from "./fixtures";

const lines = (items: { itemId: string; quantity: number }[]) => priceLines(catalog, items, { maxQuantityPerLine: 2000, bulk: true }).priced;

describe("catering (bulk) rules", () => {
  it("uses notice tiers, item-specific notice, discounts and deposits", () => {
    expect(requiredNoticeHours(40, lines([{ itemId: "mi_office_lunch_box", quantity: 40 }]), ctx.settings)).toBe(24);
    expect(requiredNoticeHours(100, lines([{ itemId: "mi_lamb_machboos", quantity: 100 }]), ctx.settings)).toBe(48);
    expect(requiredNoticeHours(200, lines([{ itemId: "mi_lamb_machboos", quantity: 200 }]), ctx.settings)).toBe(72);
    expect(requiredNoticeHours(30, lines([{ itemId: "mi_camel_machboos", quantity: 30 }]), ctx.settings)).toBe(72);
    expect([bulkDiscountPercent(50, ctx.settings), bulkDiscountPercent(51, ctx.settings), bulkDiscountPercent(150, ctx.settings)]).toEqual([0, 5, 8]);
    expect(depositFor(249_999, ctx.settings)).toBe(0);
    expect(depositFor(300_000, ctx.settings)).toBe(150_000);
  });

  const input = (items: { itemId: string; quantity: number }[], at: string, now: string, committed = 0) => {
    const l = lines(items);
    const at_ = dubai(at);
    return {
      lines: l,
      portions: l.reduce((s, x) => s + x.kitchenPortions, 0),
      fulfilmentAt: at_,
      now: dubai(now),
      ctx,
      committedPortionsByDate: new Map([[at.slice(0, 10), committed]]),
      committedItemUnits: new Map<string, number>(),
    };
  };

  it("accepts 40 office lunch boxes with 2 days' notice", () => {
    const i = input([{ itemId: "mi_office_lunch_box", quantity: 40 }], "2026-10-28T12:30", "2026-10-26T10:00");
    expect(bulkIssuesFor(i, i.fulfilmentAt)).toEqual([]);
  });

  it("flags insufficient notice and proposes feasible alternatives", () => {
    const i = input([{ itemId: "mi_lamb_machboos", quantity: 100 }], "2026-10-27T13:00", "2026-10-26T10:00");
    expect(bulkIssuesFor(i, i.fulfilmentAt).map((x) => x.code)).toEqual(["INSUFFICIENT_NOTICE"]);
    const alts = feasibleAlternatives(i);
    expect(alts[0].at >= "2026-10-28T13:00").toBe(true);
  });

  it("marks impossible requests as blocking (200 lamb machboos in 20 minutes)", () => {
    const i = input([{ itemId: "mi_lamb_machboos", quantity: 200 }], "2026-10-26T10:30", "2026-10-26T10:10");
    const issues = bulkIssuesFor(i, i.fulfilmentAt);
    expect(issues.map((x) => x.code)).toEqual(expect.arrayContaining(["ITEM_DAILY_MAXIMUM_EXCEEDED", "INSUFFICIENT_NOTICE"]));
    expect(issues.some((x) => x.blocking)).toBe(true);
  });

  it("refuses more than 250 portions and respects daily capacity", () => {
    const big = input([{ itemId: "mi_chicken_machboos", quantity: 180 }, { itemId: "mi_vegetable_machboos", quantity: 90 }], "2026-11-05T13:00", "2026-10-26T10:00");
    expect(bulkIssuesFor(big, big.fulfilmentAt).find((x) => x.code === "EXCEEDS_MAX_BULK_PORTIONS")?.blocking).toBe(true);
    const full = input([{ itemId: "mi_chicken_machboos", quantity: 60 }], "2026-11-05T13:00", "2026-10-26T10:00", 260);
    expect(bulkIssuesFor(full, full.fulfilmentAt).map((x) => x.code)).toContain("DAILY_CAPACITY_EXCEEDED");
  });

  it("rejects dishes that are cooked to order", () => {
    const i = input([{ itemId: "mi_hammour_mashwi", quantity: 30 }], "2026-11-05T13:00", "2026-10-26T10:00");
    expect(bulkIssuesFor(i, i.fulfilmentAt)[0]).toMatchObject({ code: "ITEM_NOT_BULK_ELIGIBLE", blocking: true });
  });
});

describe("phones, references, delivery zones, money", () => {
  it("normalises UAE and international numbers", () => {
    expect(checkPhone("050 123 4567")).toMatchObject({ valid: true, e164: "+971501234567", isUaeMobile: true });
    expect(checkPhone("00971 4 555 0142")).toMatchObject({ valid: true, e164: "+97145550142", isUaeMobile: false });
    expect(checkPhone("+44 7911 123456")).toMatchObject({ valid: true, isUae: false });
    expect(checkPhone("12345").valid).toBe(false);
    expect(checkPhone("").valid).toBe(false);
    expect(maskPhone("+971501234567")).toBe("+97150****67");
  });

  it("generates voice-friendly references and tolerates spoken variants", () => {
    expect(generateReference("order")).toMatch(/^ORD-\d{6}$/);
    expect(normaliseReference("ord 482 913", "order")).toBe("ORD-482913");
    expect(normaliseReference("482913", "reservation")).toBe("RES-482913");
    expect(normaliseReference("RES-482913", "order")).toBeNull();
    expect(normaliseReference("cat-118230", ["order", "bulkOrder"])).toBe("CAT-118230");
    expect(tokenMatches("secret", hashToken("secret"))).toBe(true);
    expect(tokenMatches("other", hashToken("secret"))).toBe(false);
  });

  it("matches delivery areas leniently and refuses other emirates", () => {
    expect(findDeliveryZone("karama", ctx.settings)?.zone.id).toBe("zone_b");
    expect(findDeliveryZone("Al Seef", ctx.settings)?.zone.id).toBe("zone_a");
    expect(findDeliveryZone("Dubai Marina", ctx.settings)?.zone.regularOrders).toBe(false);
    expect(findDeliveryZone("Abu Dhabi", ctx.settings)).toBeNull();
  });

  it("formats AED and extracts inclusive VAT", () => {
    expect(formatAed(7200)).toBe("AED 72");
    expect(formatAed(123450)).toBe("AED 1,234.50");
    expect(vatIncluded(10500, 5)).toBe(500);
  });
});

describe("status machines", () => {
  it("enforces order transitions per type", () => {
    expect(canTransitionOrder("confirmed", "preparing", "pickup")).toBe(true);
    expect(canTransitionOrder("preparing", "ready_for_pickup", "delivery")).toBe(false);
    expect(canTransitionOrder("completed", "cancelled", "pickup")).toBe(false);
    expect(allowedOrderTransitions("preparing", "delivery")).toEqual(["out_for_delivery", "cancelled"]);
    expect(canTransitionReservation("confirmed", "seated")).toBe(true);
    expect(canTransitionReservation("cancelled", "confirmed")).toBe(false);
  });
});

describe("search", () => {
  it("normalises transliterations and synonyms", () => {
    expect(tokenize("Majboos with dried lemon")).toEqual(tokenize("machboos loomi"));
    expect(tokenize("lugaimat")).toEqual(tokenize("luqaimat"));
    expect(tokenize("harris")).toEqual(tokenize("harees"));
    expect(tokenize("Can I book a table?")).toEqual(["reservation", "table"]);
  });
  it("ranks documents with BM25", () => {
    const idx = new SearchIndex([
      { id: "a", payload: 1, fields: [{ text: "Parking at Al Seef", weight: 2 }, { text: "public car park", weight: 1 }] },
      { id: "b", payload: 2, fields: [{ text: "Luqaimat dessert", weight: 2 }] },
    ]);
    expect(idx.search("where do I park")[0].id).toBe("a");
    expect(idx.search("zzzz")).toEqual([]);
  });
});

describe("feeding suggestions", () => {
  it("finds the cheapest combination covering the guests", () => {
    const options = cheapestCombinations(10, [
      { itemId: "a", name: "Platter", servesPeople: 4, priceFils: 30000, maxQuantity: 5 },
      { itemId: "b", name: "Single", servesPeople: 1, priceFils: 8000, maxQuantity: 10 },
    ]);
    expect(options[0].servings).toBeGreaterThanOrEqual(10);
    expect(options[0].totalFils).toBe(76000); // 2 platters + 2 singles
  });
});
