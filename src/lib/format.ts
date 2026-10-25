import { DateTime } from "luxon";

export { formatAed } from "@/domain/money";

export function formatDateLong(date: string) {
  return DateTime.fromISO(date, { zone: "Asia/Dubai" }).toFormat("cccc d LLLL yyyy");
}

export function formatDateShort(date: string) {
  return DateTime.fromISO(date, { zone: "Asia/Dubai" }).toFormat("ccc d LLL");
}

export function formatIsoDateTime(iso: string) {
  return DateTime.fromISO(iso, { setZone: true }).setZone("Asia/Dubai").toFormat("ccc d LLL, HH:mm");
}

export function formatTime12(time: string) {
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 && h < 24 ? "pm" : "am";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function todayInDubai() {
  return DateTime.now().setZone("Asia/Dubai").toISODate()!;
}

export function addDaysIso(date: string, days: number) {
  return DateTime.fromISO(date, { zone: "Asia/Dubai" }).plus({ days }).toISODate()!;
}
