import { DateTime } from "luxon";
import { RESTAURANT_TZ } from "@/domain/time";
import { getConfig } from "./config";

/**
 * The current time in Dubai. When ENABLE_TEST_CLOCK=true (never in production),
 * a request may override it with the `X-Test-Now` header so integration tests can
 * exercise day-specific rules (e.g. Friday-only dishes) on any day.
 */
export function resolveNow(testNowHeader?: string | null): DateTime {
  if (testNowHeader && getConfig().ENABLE_TEST_CLOCK) {
    const parsed = DateTime.fromISO(testNowHeader, { setZone: true });
    if (parsed.isValid) return parsed.setZone(RESTAURANT_TZ);
  }
  return DateTime.now().setZone(RESTAURANT_TZ);
}
