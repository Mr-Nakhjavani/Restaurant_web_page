import { describe, expect, it } from "vitest";
import { DateTime } from "luxon";
import { currentStatus, describeDay, getDayService, isOpenAt, nextOpening, serviceWindows } from "@/domain/hours";
import { isWithinMonthDayRange, localDateTime, minutesToTime, roundUpToSlot, timeToMinutes, toLocalDate } from "@/domain/time";
import { ctx, dubai } from "./fixtures";

describe("time helpers", () => {
  it("converts HH:mm and supports 24:00 as midnight closing", () => {
    expect(timeToMinutes("08:30")).toBe(510);
    expect(timeToMinutes("24:00")).toBe(1440);
    expect(minutesToTime(1440)).toBe("24:00");
    expect(() => timeToMinutes("25:00")).toThrow();
    expect(localDateTime("2026-10-30", "24:00").toISO()).toBe("2026-10-31T00:00:00.000+04:00");
  });

  it("rounds up to 15-minute slots in Dubai time", () => {
    expect(roundUpToSlot(dubai("2026-10-26T10:01"), 15).toFormat("HH:mm")).toBe("10:15");
    expect(roundUpToSlot(dubai("2026-10-26T10:15"), 15).toFormat("HH:mm")).toBe("10:15");
    expect(roundUpToSlot(dubai("2026-10-26T23:59:30"), 15).toISO()).toBe("2026-10-27T00:00:00.000+04:00");
  });

  it("derives the Dubai calendar date from UTC instants (UTC+4, no DST)", () => {
    // 20:30 UTC on Thursday is already 00:30 on Friday in Dubai
    expect(toLocalDate(DateTime.fromISO("2026-10-29T20:30:00Z"))).toBe("2026-10-30");
    expect(toLocalDate(DateTime.fromISO("2026-10-29T19:59:00Z"))).toBe("2026-10-29");
  });

  it("handles month-day ranges that wrap over the new year", () => {
    expect(isWithinMonthDayRange("2026-10-15", "10-15", "04-30")).toBe(true);
    expect(isWithinMonthDayRange("2027-01-10", "10-15", "04-30")).toBe(true);
    expect(isWithinMonthDayRange("2027-07-01", "10-15", "04-30")).toBe(false);
    expect(isWithinMonthDayRange("2026-10-14", "10-15", "04-30")).toBe(false);
  });
});

describe("opening hours", () => {
  it("uses the weekly schedule (Fri/Sat until midnight)", () => {
    const fri = getDayService("2026-10-30", ctx);
    expect(fri.weekday).toBe("Friday");
    expect([fri.open, fri.close]).toEqual([480, 1440]);
    const mon = getDayService("2026-10-26", ctx);
    expect(mon.close).toBe(23 * 60);
  });

  it("applies the Ramadan override (12:00–24:00) and flags it as provisional", () => {
    const d = describeDay("2027-02-15", ctx);
    expect(d.opensAt).toBe("12:00");
    expect(d.closesAt).toBe("24:00");
    expect(d.hoursSource).toBe("special_period");
    expect(d.notes.join(" ")).toMatch(/provisional/);
  });

  it("closes the dining room from 18:00 on the private-event date but keeps takeaway open", () => {
    const day = getDayService("2026-11-14", ctx);
    expect(serviceWindows(day, "reservations")).toEqual([{ start: 480, end: 1080, endsAtClosure: true }]);
    expect(serviceWindows(day, "orders")).toEqual([{ start: 480, end: 1440, endsAtClosure: false }]);
  });

  it("opens at 14:00 on the first day of Eid Al Fitr", () => {
    const d = describeDay("2027-03-10", ctx);
    expect(d.opensAt).toBe("14:00");
    expect(isOpenAt(dubai("2027-03-10T13:00"), ctx)).toBe(false);
    expect(isOpenAt(dubai("2027-03-10T14:30"), ctx)).toBe(true);
  });

  it("reports current status and the next opening", () => {
    const late = dubai("2026-10-26T23:30");
    expect(currentStatus(late, ctx).isOpen).toBe(false);
    expect(nextOpening(late, ctx)).toEqual({ date: "2026-10-27", time: "08:00" });
    const lunch = currentStatus(dubai("2026-10-26T13:00"), ctx);
    expect(lunch).toMatchObject({ isOpen: true, kitchenOpen: true, closesAt: "23:00", kitchenLastOrderAt: "22:30" });
    expect(currentStatus(dubai("2026-10-26T22:45"), ctx).kitchenOpen).toBe(false);
  });
});
