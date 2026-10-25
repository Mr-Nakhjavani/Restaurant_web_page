import type { DateTime } from "luxon";
import type { RestaurantSettings } from "./settings";
import type { ClosureDef, SpecialPeriodDef } from "./types";
import { WEEKDAY_NAMES } from "./types";
import { isoWeekday, minutesOfDay, minutesToTime, timeToMinutes, toLocalDate } from "./time";

export type ServicePurpose = "dining" | "reservations" | "orders";

export interface ServiceWindow {
  start: number;
  end: number;
  /** True when the window ends because of a closure rather than normal closing time. */
  endsAtClosure: boolean;
}

export interface DayService {
  date: string;
  weekday: string;
  /** Regular or overridden opening hours for the day (before closures are applied). */
  open: number | null;
  close: number | null;
  hoursSource: "weekly" | "special_period";
  specialPeriods: SpecialPeriodDef[];
  closures: ClosureDef[];
}

export interface CalendarContext {
  settings: RestaurantSettings;
  specialPeriods: SpecialPeriodDef[];
  closures: ClosureDef[];
}

export function periodsOn(date: string, periods: SpecialPeriodDef[]): SpecialPeriodDef[] {
  return periods.filter((p) => date >= p.startDate && date <= p.endDate);
}

export function getDayService(date: string, ctx: CalendarContext): DayService {
  const weekday = isoWeekday(date);
  const periods = periodsOn(date, ctx.specialPeriods);
  const override = periods.find((p) => p.hoursOverride)?.hoursOverride ?? null;
  const base = override ?? ctx.settings.weeklyHours[String(weekday) as keyof RestaurantSettings["weeklyHours"]];
  return {
    date,
    weekday: WEEKDAY_NAMES[weekday],
    open: base ? timeToMinutes(base.open) : null,
    close: base ? timeToMinutes(base.close) : null,
    hoursSource: override ? "special_period" : "weekly",
    specialPeriods: periods,
    closures: ctx.closures.filter((c) => c.date === date),
  };
}

/** Opening windows for a purpose after subtracting closures that apply to it. */
export function serviceWindows(day: DayService, purpose: ServicePurpose): ServiceWindow[] {
  if (day.open === null || day.close === null || day.close <= day.open) return [];
  let windows: ServiceWindow[] = [{ start: day.open, end: day.close, endsAtClosure: false }];
  for (const c of day.closures) {
    const applies =
      c.scope === "all" ||
      (c.scope === "reservations" && (purpose === "reservations" || purpose === "dining")) ||
      (c.scope === "orders" && purpose === "orders");
    if (!applies) continue;
    const cs = c.startTime ? timeToMinutes(c.startTime) : 0;
    const ce = c.endTime ? timeToMinutes(c.endTime) : 1440;
    const next: ServiceWindow[] = [];
    for (const w of windows) {
      if (ce <= w.start || cs >= w.end) {
        next.push(w);
        continue;
      }
      if (cs > w.start) next.push({ start: w.start, end: cs, endsAtClosure: true });
      if (ce < w.end) next.push({ start: ce, end: w.end, endsAtClosure: w.endsAtClosure });
    }
    windows = next;
  }
  return windows;
}

export function isOpenAt(dt: DateTime, ctx: CalendarContext, purpose: ServicePurpose = "dining"): boolean {
  const day = getDayService(toLocalDate(dt), ctx);
  const m = minutesOfDay(dt);
  return serviceWindows(day, purpose).some((w) => m >= w.start && m < w.end);
}

export interface PublicDayHours {
  date: string;
  weekday: string;
  isOpen: boolean;
  opensAt: string | null;
  closesAt: string | null;
  kitchenLastOrderAt: string | null;
  windows: { dining: { start: string; end: string }[]; orders: { start: string; end: string }[] };
  hoursSource: "weekly" | "special_period";
  specialPeriods: { id: string; name: string; type: string; provisional: boolean; notes: string }[];
  closures: { reason: string; publicNote: string; scope: string; startTime: string | null; endTime: string | null }[];
  notes: string[];
}

export function describeDay(date: string, ctx: CalendarContext): PublicDayHours {
  const day = getDayService(date, ctx);
  const dining = serviceWindows(day, "dining");
  const orders = serviceWindows(day, "orders");
  const lastClose = dining.length ? Math.max(...dining.map((w) => w.end)) : null;
  const firstOpen = dining.length ? Math.min(...dining.map((w) => w.start)) : null;
  const notes: string[] = [];
  const ramadan = day.specialPeriods.find((p) => p.type === "ramadan");
  if (ramadan) notes.push(`Ramadan hours apply${ramadan.provisional ? " (provisional dates, subject to moon sighting)" : ""}. Breakfast is not served.`);
  for (const p of day.specialPeriods) if (p.type !== "ramadan") notes.push(p.notes);
  for (const c of day.closures) notes.push(c.publicNote);
  const fmt = (w: ServiceWindow[]) => w.map((x) => ({ start: minutesToTime(x.start), end: minutesToTime(x.end) }));
  return {
    date,
    weekday: day.weekday,
    isOpen: dining.length > 0 || orders.length > 0,
    opensAt: firstOpen !== null ? minutesToTime(firstOpen) : null,
    closesAt: lastClose !== null ? minutesToTime(lastClose) : null,
    kitchenLastOrderAt:
      lastClose !== null ? minutesToTime(lastClose - ctx.settings.kitchenLastOrderMinutesBeforeClose) : null,
    windows: { dining: fmt(dining), orders: fmt(orders) },
    hoursSource: day.hoursSource,
    specialPeriods: day.specialPeriods.map((p) => ({ id: p.id, name: p.name, type: p.type, provisional: p.provisional, notes: p.notes })),
    closures: day.closures.map((c) => ({ reason: c.reason, publicNote: c.publicNote, scope: c.scope, startTime: c.startTime, endTime: c.endTime })),
    notes,
  };
}

export function currentStatus(now: DateTime, ctx: CalendarContext) {
  const date = toLocalDate(now);
  const day = getDayService(date, ctx);
  const m = minutesOfDay(now);
  const dining = serviceWindows(day, "dining");
  const current = dining.find((w) => m >= w.start && m < w.end);
  const kitchenOpen = current ? m < current.end - ctx.settings.kitchenLastOrderMinutesBeforeClose : false;
  return {
    localDate: date,
    localTime: minutesToTime(m),
    isOpen: !!current,
    kitchenOpen,
    closesAt: current ? minutesToTime(current.end) : null,
    kitchenLastOrderAt: current ? minutesToTime(current.end - ctx.settings.kitchenLastOrderMinutesBeforeClose) : null,
  };
}

/** Next opening moment strictly after `now` (searching up to 14 days). */
export function nextOpening(now: DateTime, ctx: CalendarContext): { date: string; time: string } | null {
  const date = toLocalDate(now);
  const m = minutesOfDay(now);
  for (let i = 0; i < 14; i++) {
    const d = now.plus({ days: i });
    const ds = toLocalDate(d);
    const windows = serviceWindows(getDayService(ds, ctx), "dining");
    for (const w of windows) {
      if (ds === date && w.start <= m) continue;
      return { date: ds, time: minutesToTime(w.start) };
    }
  }
  return null;
}
