import { describe, expect, it } from "vitest";
import { leadMinutes, listSlots, planFulfilment, slotKey, type CapacityUsage } from "@/domain/order-rules";
import { chooseTable, listReservationSlots, reservationDuration, validateReservationRequest, type ExistingBooking } from "@/domain/reservation-rules";
import { ctx, dubai } from "./fixtures";

const NOW = dubai("2026-10-26T10:02");
const empty: CapacityUsage = new Map();
const base = { now: NOW, maxPrepMinutes: 15, portions: 2, ctx, usage: empty };

describe("order timing and kitchen capacity", () => {
  it("lead time is the longest preparation plus buffer, never below the minimum", () => {
    expect(leadMinutes(20, ctx)).toBe(30);
    expect(leadMinutes(5, ctx)).toBe(20);
  });

  it("ASAP picks the first slot after the lead time", () => {
    const plan = planFulfilment({ type: "pickup", asap: true }, base);
    expect(plan.ok).toBe(true);
    expect(plan.promisedAt!.toFormat("yyyy-MM-dd HH:mm")).toBe("2026-10-26 10:30");
  });

  it("rejects a pickup time the kitchen cannot meet and offers the earliest times", () => {
    const plan = planFulfilment({ type: "pickup", date: "2026-10-26", time: "10:15" }, base);
    expect(plan).toMatchObject({ ok: false, code: "TIME_TOO_SOON" });
    expect(plan.alternatives[0].time).toBe("10:30");
  });

  it("rejects times off the 15-minute grid, outside hours and beyond 7 days", () => {
    expect(planFulfilment({ type: "pickup", date: "2026-10-26", time: "13:07" }, base).code).toBe("INVALID_TIME");
    expect(planFulfilment({ type: "pickup", date: "2026-10-26", time: "23:00" }, base).code).toBe("OUTSIDE_ORDERING_HOURS");
    expect(planFulfilment({ type: "pickup", date: "2026-11-05", time: "13:00" }, base).code).toBe("TOO_FAR_IN_ADVANCE");
  });

  it("delivery arrival times respect 12:00–22:30 and the zone drive time", () => {
    const zone = ctx.settings.delivery.zones[1];
    const early = planFulfilment({ type: "delivery", date: "2026-10-27", time: "11:00", zone }, base);
    expect(early.code).toBe("OUTSIDE_ORDERING_HOURS");
    const ok = planFulfilment({ type: "delivery", date: "2026-10-27", time: "13:00", zone }, base);
    expect(ok.ok).toBe(true);
    expect(ok.readyAt!.toFormat("HH:mm")).toBe("12:35");
  });

  it("refuses a full slot and suggests neighbouring slots", () => {
    const usage: CapacityUsage = new Map([[slotKey(dubai("2026-10-27T13:00"), 15), { portions: 29, orders: 3 }]]);
    const plan = planFulfilment({ type: "pickup", date: "2026-10-27", time: "13:00" }, { ...base, usage, portions: 2 });
    expect(plan.code).toBe("SLOT_FULL");
    expect(plan.alternatives.map((a) => a.time)).toEqual(expect.arrayContaining(["12:45", "13:15"]));
    const slots = listSlots("2026-10-27", { type: "pickup" }, { ...base, usage });
    expect(slots.find((s) => s.time === "13:00")?.remainingPortions).toBe(1);
  });

  it("stops taking orders when ordering is paused", () => {
    const paused = { ...ctx, settings: { ...ctx.settings, ordering: { ...ctx.settings.ordering, acceptingOrders: false } } };
    expect(planFulfilment({ type: "pickup", asap: true }, { ...base, ctx: paused }).code).toBe("ORDERING_PAUSED");
  });
});

describe("reservation rules", () => {
  const now = dubai("2026-10-26T10:00");
  it("sets table time by party size and area", () => {
    expect(reservationDuration(2, "indoor", ctx)).toBe(90);
    expect(reservationDuration(6, "window", ctx)).toBe(120);
    expect(reservationDuration(10, "indoor", ctx)).toBe(150);
    expect(reservationDuration(8, "majlis", ctx)).toBe(180);
  });

  it("validates party size, dates, hours, majlis and terrace rules", () => {
    const v = (r: Partial<Parameters<typeof validateReservationRequest>[0]>) =>
      validateReservationRequest({ date: "2026-10-28", time: "19:00", partySize: 4, preference: "no_preference", ...r }, now, ctx).map((x) => x.code);
    expect(v({})).toEqual([]);
    expect(v({ partySize: 0 })).toEqual(["INVALID_PARTY_SIZE"]);
    expect(v({ partySize: 25 })).toEqual(["PARTY_TOO_LARGE"]);
    expect(v({ date: "2026-10-20" })).toEqual(["DATE_IN_PAST"]);
    expect(v({ date: "2027-01-30" })).toContain("TOO_FAR_IN_ADVANCE");
    expect(v({ time: "22:00" })).toContain("OUTSIDE_SEATING_HOURS"); // last seating 21:30 Mon–Thu
    expect(v({ time: "19:10" })).toContain("INVALID_TIME");
    expect(v({ preference: "majlis", partySize: 4 })).toContain("MAJLIS_MIN_PARTY");
    expect(v({ preference: "majlis", partySize: 8, date: "2026-10-26", time: "20:00" })).toContain("MAJLIS_NOTICE");
    expect(validateReservationRequest({ date: "2026-12-15", time: "19:00", partySize: 2, preference: "terrace" }, now, ctx)).toEqual([]);
    expect(validateReservationRequest({ date: "2026-12-15", time: "19:00", partySize: 2, preference: "terrace" }, dubai("2026-12-01T10:00"), { ...ctx, settings: { ...ctx.settings, reservations: { ...ctx.settings.reservations, terraceOpen: false } } }).map((x) => x.code)).toContain("TERRACE_CLOSED");
  });

  it("closes the terrace in summer", () => {
    const v = validateReservationRequest({ date: "2027-07-15", time: "19:00", partySize: 2, preference: "terrace" }, dubai("2027-06-01T10:00"), ctx);
    expect(v.map((x) => x.code)).toContain("TERRACE_CLOSED");
  });

  it("blocks bookings that would run into the 14 November private event", () => {
    expect(validateReservationRequest({ date: "2026-11-14", time: "16:30", partySize: 2, preference: "indoor" }, now, ctx).map((x) => x.code)).toEqual([]);
    expect(validateReservationRequest({ date: "2026-11-14", time: "17:00", partySize: 2, preference: "indoor" }, now, ctx).map((x) => x.code)).toContain("OUTSIDE_SEATING_HOURS");
  });

  it("chooses the smallest free table and never double-books", () => {
    const req = { date: "2026-10-28", time: "19:00", partySize: 2, preference: "window" as const };
    const first = chooseTable(req, ctx.tables, [], ctx)!;
    expect(first.table.code).toBe("W1");
    const booked: ExistingBooking[] = [{ id: "r1", tableId: first.table.id, startAt: first.startAt, blockedUntil: first.blockedUntil }];
    expect(chooseTable(req, ctx.tables, booked, ctx)!.table.code).toBe("W2");
    // a booking that starts during the first booking's turnover buffer cannot use W1
    const overlap = chooseTable({ ...req, time: "20:30" }, ctx.tables, booked, ctx)!;
    expect(overlap.table.code).toBe("W2");
    const after = chooseTable({ ...req, time: "20:45" }, ctx.tables, booked, ctx)!;
    expect(after.table.code).toBe("W1");
  });

  it("never offers walk-in-only tables online and honours wheelchair access", () => {
    const tables = ctx.tables;
    const picks = new Set<string>();
    const existing: ExistingBooking[] = [];
    for (let i = 0; i < 12; i++) {
      const c = chooseTable({ date: "2026-10-28", time: "19:00", partySize: 2, preference: "indoor" }, tables, existing, ctx);
      if (!c) break;
      picks.add(c.table.code);
      existing.push({ id: `x${i}`, tableId: c.table.id, startAt: c.startAt, blockedUntil: c.blockedUntil });
    }
    expect([...picks]).not.toContain("M1");
    expect([...picks]).not.toContain("M5");
    const accessible = chooseTable({ date: "2026-10-28", time: "19:00", partySize: 4, preference: "window", wheelchair: true }, tables, [], ctx)!;
    expect(accessible.table.features).toContain("wheelchair_accessible");
  });

  it("lists slots with areas and hides those inside the minimum notice", () => {
    const slots = listReservationSlots("2026-10-26", 2, ctx.tables, [], dubai("2026-10-26T18:50"), ctx);
    expect(slots[0].time).toBe("19:30");
    expect(slots.at(-1)!.time).toBe("21:30");
    expect(slots[0].areas).toEqual(expect.arrayContaining(["indoor", "window", "terrace"]));
  });
});
