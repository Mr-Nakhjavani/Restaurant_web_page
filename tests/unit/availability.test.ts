import { describe, expect, it } from "vitest";
import { evaluateItemAvailability } from "@/domain/availability";
import { ctx, dubai, item, withItem } from "./fixtures";

const NOW = dubai("2026-10-26T09:00"); // Monday morning
const codes = (r: { reasons: { code: string }[] }) => r.reasons.map((x) => x.code);

describe("special-day availability rules", () => {
  it("serves the Friday platter only on Fridays and points to the next Friday", () => {
    const tue = evaluateItemAvailability(item("mi_friday_platter"), { at: dubai("2026-10-27T13:00"), now: NOW, mode: "pickup" }, ctx);
    expect(tue.orderable).toBe(false);
    expect(codes(tue)).toContain("NOT_AVAILABLE_ON_DAY");
    expect(tue.nextAvailable?.date).toBe("2026-10-30");
    const fri = evaluateItemAvailability(item("mi_friday_platter"), { at: dubai("2026-10-30T13:00"), now: NOW, mode: "pickup" }, ctx);
    expect(fri.orderable).toBe(true);
  });

  it("evaluates weekdays in Dubai time at the midnight boundary", () => {
    // Thursday 23:45 Dubai is still Thursday: the Friday platter is not served then
    const thursdayNight = evaluateItemAvailability(item("mi_friday_platter"), { at: dubai("2026-10-29T23:45"), now: NOW, mode: "pickup" }, ctx);
    expect(codes(thursdayNight)).toContain("NOT_AVAILABLE_ON_DAY");
    // the camel machboos (Thursday) is no longer available at 00:15 Friday Dubai time
    const fridayEarly = evaluateItemAvailability(item("mi_camel_machboos"), { at: dubai("2026-10-30T00:15"), now: NOW, mode: "dine_in" }, ctx);
    expect(codes(fridayEarly)).toContain("NOT_AVAILABLE_ON_DAY");
  });

  it("refuses the Friday platter for delivery and with less than 2 hours' notice", () => {
    const delivery = evaluateItemAvailability(item("mi_friday_platter"), { at: dubai("2026-10-30T13:00"), now: NOW, mode: "delivery" }, ctx);
    expect(codes(delivery)).toContain("FULFILMENT_NOT_SUPPORTED");
    const rushed = evaluateItemAvailability(item("mi_friday_platter"), { at: dubai("2026-10-30T13:00"), now: dubai("2026-10-30T12:00"), mode: "pickup" }, ctx);
    expect(codes(rushed)).toContain("INSUFFICIENT_NOTICE");
  });

  it("limits breakfast dishes to 08:00–11:30 and never delivers them", () => {
    expect(evaluateItemAvailability(item("mi_balaleet"), { at: dubai("2026-10-26T11:30"), now: NOW, mode: "pickup" }, ctx).orderable).toBe(true);
    expect(codes(evaluateItemAvailability(item("mi_balaleet"), { at: dubai("2026-10-26T11:45"), now: NOW, mode: "pickup" }, ctx))).toContain("OUTSIDE_ITEM_HOURS");
    expect(codes(evaluateItemAvailability(item("mi_balaleet"), { at: dubai("2026-10-26T10:00"), now: NOW, mode: "delivery" }, ctx))).toContain("FULFILMENT_NOT_SUPPORTED");
  });

  it("does not serve breakfast during Ramadan", () => {
    const r = evaluateItemAvailability(item("mi_balaleet"), { at: dubai("2027-02-15T12:30"), now: NOW, mode: "dine_in" }, ctx);
    expect(codes(r)).toContain("NOT_DURING_SPECIAL_PERIOD");
  });

  it("serves the Iftar set only during Ramadan, with a 14:00 same-day cutoff and a minimum of 2", () => {
    const outside = evaluateItemAvailability(item("mi_iftar_set"), { at: dubai("2026-10-31T18:00"), now: NOW, mode: "pickup", quantity: 2 }, ctx);
    expect(codes(outside)).toContain("OUTSIDE_SPECIAL_PERIOD");
    expect(outside.reasons[0].message).toMatch(/Ramadan 2027/);
    const inside = evaluateItemAvailability(item("mi_iftar_set"), { at: dubai("2027-02-15T18:00"), now: dubai("2027-02-15T10:00"), mode: "pickup", quantity: 2 }, ctx);
    expect(inside.orderable).toBe(true);
    const late = evaluateItemAvailability(item("mi_iftar_set"), { at: dubai("2027-02-15T18:00"), now: dubai("2027-02-15T14:30"), mode: "pickup", quantity: 2 }, ctx);
    expect(codes(late)).toContain("SAME_DAY_CUTOFF_PASSED");
    const single = evaluateItemAvailability(item("mi_iftar_set"), { at: dubai("2027-02-15T18:00"), now: dubai("2027-02-15T10:00"), mode: "pickup", quantity: 1 }, ctx);
    expect(codes(single)).toContain("BELOW_MINIMUM_QUANTITY");
  });

  it("opens National Day pre-orders on 15 November and needs 24 hours' notice", () => {
    const early = evaluateItemAvailability(item("mi_etihad_feast"), { at: dubai("2026-12-02T13:00"), now: dubai("2026-10-26T10:00"), mode: "pickup" }, ctx);
    expect(codes(early)).toContain("PREORDERS_NOT_OPEN");
    const ok = evaluateItemAvailability(item("mi_etihad_feast"), { at: dubai("2026-12-02T13:00"), now: dubai("2026-11-20T10:00"), mode: "pickup" }, ctx);
    expect(ok.orderable).toBe(true);
    const short = evaluateItemAvailability(item("mi_etihad_feast"), { at: dubai("2026-12-02T13:00"), now: dubai("2026-12-02T09:00"), mode: "pickup" }, ctx);
    expect(codes(short)).toContain("INSUFFICIENT_NOTICE");
    const after = evaluateItemAvailability(item("mi_etihad_feast"), { at: dubai("2026-12-04T13:00"), now: dubai("2026-11-20T10:00"), mode: "pickup" }, ctx);
    expect(codes(after)).toContain("OUTSIDE_SPECIAL_PERIOD");
  });

  it("respects the seasonal dessert's inclusive date range", () => {
    const at = (d: string) => evaluateItemAvailability(item("mi_aseedat_bobar"), { at: dubai(`${d}T13:00`), now: dubai("2026-10-26T09:00"), mode: "dine_in" }, ctx);
    expect(codes(at("2026-10-31"))).toContain("OUTSIDE_DATE_RANGE");
    expect(at("2026-11-01").orderable).toBe(true);
    expect(at("2027-02-28").orderable).toBe(true);
    expect(codes(at("2027-03-01"))).toContain("OUTSIDE_DATE_RANGE");
    expect(at("2026-10-31").nextAvailable?.date).toBe("2026-11-01");
  });

  it("applies sold-out flags until their expiry and daily limits", () => {
    const soldOut = withItem("mi_harees", { availabilityStatus: "sold_out", soldOutUntil: "2026-10-26T23:59:59.999+04:00" });
    const today = evaluateItemAvailability(soldOut, { at: dubai("2026-10-26T13:00"), now: NOW, mode: "pickup" }, ctx);
    expect(today.status).toBe("sold_out");
    expect(today.nextAvailable?.date).toBe("2026-10-27");
    expect(evaluateItemAvailability(soldOut, { at: dubai("2026-10-27T13:00"), now: NOW, mode: "pickup" }, ctx).orderable).toBe(true);
    const limited = evaluateItemAvailability(item("mi_harees"), { at: dubai("2026-10-26T13:00"), now: NOW, mode: "pickup", quantity: 3, alreadyOrderedOnDate: 28 }, ctx);
    expect(codes(limited)).toContain("DAILY_LIMIT_REACHED");
    expect(limited.remainingOnDate).toBe(2);
  });

  it("keeps catering-only dishes out of regular orders", () => {
    const r = evaluateItemAvailability(item("mi_whole_lamb_ouzi"), { at: dubai("2026-10-28T13:00"), now: NOW, mode: "pickup" }, ctx);
    expect(codes(r)).toContain("BULK_ONLY_ITEM");
    expect(evaluateItemAvailability(item("mi_whole_lamb_ouzi"), { at: dubai("2026-10-28T13:00"), now: NOW, mode: "pickup", bulk: true }, ctx).orderable).toBe(true);
  });

  it("marks paused dishes unavailable with no next date", () => {
    const paused = evaluateItemAvailability(withItem("mi_hammour_mashwi", { availabilityStatus: "paused" }), { at: dubai("2026-10-26T13:00"), now: NOW, mode: "pickup" }, ctx);
    expect(codes(paused)).toContain("ITEM_PAUSED");
    expect(paused.nextAvailable).toBeNull();
  });

  it("rejects times in the past", () => {
    const r = evaluateItemAvailability(item("mi_karak"), { at: dubai("2026-10-26T08:00"), now: NOW, mode: "pickup" }, ctx);
    expect(codes(r)).toContain("IN_THE_PAST");
  });
});
