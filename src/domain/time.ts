import { DateTime } from "luxon";
import type { IsoWeekday } from "./types";

/** The restaurant's only timezone. Dubai observes no daylight-saving time (UTC+04:00 all year). */
export const RESTAURANT_TZ = "Asia/Dubai";

export function nowInDubai(): DateTime {
  return DateTime.now().setZone(RESTAURANT_TZ);
}

/** "HH:mm" → minutes after local midnight. "24:00" → 1440. */
export function timeToMinutes(time: string): number {
  const m = /^(\d{2}):(\d{2})$/.exec(time);
  if (!m) throw new Error(`Invalid time "${time}"`);
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 24 || min > 59 || (h === 24 && min !== 0)) throw new Error(`Invalid time "${time}"`);
  return h * 60 + min;
}

/** Minutes after midnight → "HH:mm" (1440 → "24:00"). */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function isValidLocalDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  return DateTime.fromISO(date, { zone: RESTAURANT_TZ }).isValid;
}

export function isValidLocalTime(time: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(time)) return false;
  try {
    const m = timeToMinutes(time);
    return m >= 0 && m < 1440;
  } catch {
    return false;
  }
}

/** Start of a local calendar day in Dubai. */
export function localDay(date: string): DateTime {
  const dt = DateTime.fromISO(date, { zone: RESTAURANT_TZ });
  if (!dt.isValid) throw new Error(`Invalid date "${date}"`);
  return dt.startOf("day");
}

/** A local date + local time (minutes or HH:mm) as a zoned DateTime. Handles 24:00. */
export function localDateTime(date: string, time: string | number): DateTime {
  const minutes = typeof time === "number" ? time : timeToMinutes(time);
  return localDay(date).plus({ minutes });
}

export function toLocalDate(dt: DateTime): string {
  return dt.setZone(RESTAURANT_TZ).toISODate()!;
}

export function toLocalTime(dt: DateTime): string {
  return dt.setZone(RESTAURANT_TZ).toFormat("HH:mm");
}

export function minutesOfDay(dt: DateTime): number {
  const local = dt.setZone(RESTAURANT_TZ);
  return local.hour * 60 + local.minute;
}

export function isoWeekday(date: string): IsoWeekday {
  return localDay(date).weekday as IsoWeekday;
}

export function addDays(date: string, days: number): string {
  return localDay(date).plus({ days }).toISODate()!;
}

export function daysBetween(fromDate: string, toDate: string): number {
  return Math.round(localDay(toDate).diff(localDay(fromDate), "days").days);
}

/** Round a DateTime up to the next slot boundary (minutes) within its local day. */
export function roundUpToSlot(dt: DateTime, slotMinutes: number): DateTime {
  const local = dt.setZone(RESTAURANT_TZ);
  const dayStart = local.startOf("day");
  const slotMs = slotMinutes * 60_000;
  const elapsed = local.toMillis() - dayStart.toMillis();
  return dayStart.plus({ milliseconds: Math.ceil(elapsed / slotMs) * slotMs });
}

export function floorToSlot(dt: DateTime, slotMinutes: number): DateTime {
  const local = dt.setZone(RESTAURANT_TZ);
  const mins = local.hour * 60 + local.minute;
  return local.startOf("day").plus({ minutes: Math.floor(mins / slotMinutes) * slotMinutes });
}

/** ISO-8601 with the +04:00 offset, e.g. 2026-10-25T13:30:00.000+04:00 */
export function toIsoLocal(dt: DateTime): string {
  return dt.setZone(RESTAURANT_TZ).toISO()!;
}

export function formatHumanDate(date: string): string {
  return localDay(date).toFormat("cccc d LLLL yyyy");
}

export function formatHumanDateTime(dt: DateTime): string {
  return dt.setZone(RESTAURANT_TZ).toFormat("cccc d LLLL yyyy, HH:mm");
}

/** Month-day "MM-dd" inclusive range check that wraps over the new year (e.g. 10-15 → 04-30). */
export function isWithinMonthDayRange(date: string, start: string, end: string): boolean {
  const md = date.slice(5);
  if (start <= end) return md >= start && md <= end;
  return md >= start || md <= end;
}
