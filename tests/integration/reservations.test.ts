import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { AGENT_KEY, bearer, call, customer, MONDAY_10, apiKey } from "./helpers";
import { clearTransactions } from "./db-reset";

beforeAll(clearTransactions);

const book = (body: Record<string, unknown>, opts: { headers?: Record<string, string>; now?: string } = {}) =>
  call("POST", "/reservations", { body, now: opts.now ?? MONDAY_10, headers: opts.headers });

describe("reservations", () => {
  it("books a table, returns a stable reference and a token, and is retrievable only with verification", async () => {
    const r = await book({ date: "2026-10-27", time: "19:30", partySize: 6, seatingPreference: "no_preference", customer: customer(1), occasion: "birthday" }, { headers: bearer(AGENT_KEY) });
    expect(r.status).toBe(201);
    const res = r.body.data.reservation;
    expect(res).toMatchObject({ status: "confirmed", confirmed: true, partySize: 6, date: "2026-10-27", time: "19:30", channel: "phone", durationMinutes: 120 });
    expect(res.reference).toMatch(/^RES-\d{6}$/);
    expect(res.tableCode).toBeNull();
    expect(r.body.data.message).toMatch(/confirmed/);
    const anonymous = await call("GET", `/reservations/${res.reference}`);
    expect(anonymous.status).toBe(401);
    expect(anonymous.body.error.code).toBe("VERIFICATION_REQUIRED");
    const wrong = await call("GET", `/reservations/${res.reference}`, { headers: { "x-customer-phone": "050 999 9999" } });
    expect(wrong.status).toBe(404);
    expect(wrong.body.error.code).toBe("RECORD_NOT_FOUND");
    const byPhone = await call("GET", `/reservations/${res.reference.toLowerCase().replace("-", " ")}`, { headers: { "x-customer-phone": "+971501001001" }, now: MONDAY_10 });
    expect(byPhone.status).toBe(200);
    const byToken = await call("GET", `/reservations/${res.reference}`, { headers: { "x-access-token": r.body.data.accessToken }, now: MONDAY_10 });
    expect(byToken.body.data.reference).toBe(res.reference);
    const staff = await call("GET", `/reservations/${res.reference}`, { headers: bearer(await apiKey(["staff"])), now: MONDAY_10 });
    expect(staff.body.data.tableCode).toMatch(/^[MWTL]/);
  });

  it("rejects invalid dates, party sizes, times and missing phone numbers", async () => {
    const past = await book({ date: "2026-10-20", time: "19:00", partySize: 2, customer: customer(2) });
    expect(past.body.error.code).toBe("DATE_IN_PAST");
    const zero = await book({ date: "2026-10-27", time: "19:00", partySize: 0, customer: customer(2) });
    expect(zero.status).toBe(400);
    const tooMany = await book({ date: "2026-10-27", time: "19:00", partySize: 25, customer: customer(2) });
    expect(tooMany.status).toBe(422);
    expect(tooMany.body.error.code).toBe("PARTY_TOO_LARGE");
    const late = await book({ date: "2026-10-27", time: "22:30", partySize: 2, customer: customer(2) });
    expect(late.body.error.code).toBe("OUTSIDE_SEATING_HOURS");
    expect(late.body.error.details.alternatives.length).toBeGreaterThan(0);
    const noPhone = await call("POST", "/reservations", { body: { date: "2026-10-27", time: "19:00", partySize: 2, customer: { name: "No Phone" } }, now: MONDAY_10 });
    expect(noPhone.status).toBe(400);
    expect(noPhone.body.error.details.issues[0].path).toBe("customer.phone");
    const badPhone = await book({ date: "2026-10-27", time: "19:00", partySize: 2, customer: { name: "Bad Phone", phone: "12345" } });
    expect(badPhone.body.error.code).toBe("INVALID_PHONE");
  });

  it("refuses the terrace in summer and the dining room during the private event", async () => {
    const summer = await book({ date: "2026-11-14", time: "19:00", partySize: 2, seatingPreference: "indoor", customer: customer(3) });
    expect(summer.body.error.code).toBe("OUTSIDE_SEATING_HOURS");
    const event = await call("GET", "/reservations/availability?date=2026-11-14&partySize=2", { now: MONDAY_10 });
    expect(event.body.data.slots.at(-1).time <= "16:30").toBe(true);
  });

  it("prevents the same phone booking twice at overlapping times", async () => {
    const first = await book({ date: "2026-10-28", time: "13:00", partySize: 2, customer: customer(4) });
    expect(first.status).toBe(201);
    const dup = await book({ date: "2026-10-28", time: "13:30", partySize: 2, customer: customer(4) });
    expect(dup.status).toBe(409);
    expect(dup.body.error).toMatchObject({ code: "DUPLICATE_RESERVATION", details: { existingReference: first.body.data.reservation.reference } });
  });

  it("refuses a full seating area with alternatives instead of silently moving the guest", async () => {
    const date = "2026-10-29";
    // five window tables seat two (W6 needs at least four guests)
    for (let i = 0; i < 5; i++) {
      const r = await book({ date, time: "20:00", partySize: 2, seatingPreference: "window", customer: customer(20 + i) });
      expect(r.status, JSON.stringify(r.body)).toBe(201);
      expect(r.body.data.reservation.seatingArea).toBe("window");
    }
    const full = await book({ date, time: "20:00", partySize: 2, seatingPreference: "window", customer: customer(30) });
    expect(full.status).toBe(409);
    expect(full.body.error.code).toBe("SEATING_PREFERENCE_UNAVAILABLE");
    expect(full.body.error.details.availableAreas).toEqual(expect.arrayContaining(["indoor"]));
    const avail = await call("GET", `/reservations/availability?date=${date}&partySize=2&time=20:00&seatingPreference=window`, { now: MONDAY_10 });
    expect(avail.body.data.requested).toMatchObject({ available: false, preferenceAvailable: false });
    expect(avail.body.data.alternatives.every((s: { time: string }) => s.time !== "20:00")).toBe(true);
  });

  it("never gives the same table to two concurrent callers", async () => {
    const date = "2026-10-30";
    // fill every bookable table able to seat 8 except one, then race 8 callers for the last one
    const requests = Array.from({ length: 8 }, (_, i) =>
      book({ date, time: "20:30", partySize: 8, seatingPreference: "terrace", customer: customer(100 + i) }, { headers: { "idempotency-key": `race-${i}-xxxxxxxx` } }),
    );
    const results = await Promise.all(requests);
    const ok = results.filter((r) => r.status === 201);
    const conflicts = results.filter((r) => r.status === 409);
    expect(ok).toHaveLength(1); // the terrace has exactly one table for 8 (T9)
    expect(conflicts).toHaveLength(7);
    const rows = await prisma.reservation.findMany({ where: { date, time: "20:30", seatingArea: "terrace" } });
    expect(rows).toHaveLength(1);
  });

  it("the database itself rejects overlapping bookings for a table (exclusion constraint)", async () => {
    const existing = await prisma.reservation.findFirstOrThrow({ where: { date: "2026-10-30", seatingArea: "terrace" } });
    await expect(
      prisma.reservation.create({
        data: { ...existing, id: undefined, reference: "RES-000001", phone: "+971509999999", createdAt: undefined, updatedAt: undefined } as never,
      }),
    ).rejects.toThrow();
  });

  it("holds large groups as pending confirmation and allows staff to confirm", async () => {
    const r = await book({ date: "2026-10-31", time: "13:00", partySize: 14, customer: customer(40) });
    expect(r.status).toBe(201);
    expect(r.body.data.reservation).toMatchObject({ status: "pending_confirmation", confirmed: false });
    expect(r.body.data.message).toMatch(/NOT yet confirmed/);
    const staff = await apiKey(["staff"]);
    const confirm = await call("POST", `/admin/reservations/${r.body.data.reservation.reference}/status`, { body: { status: "confirmed" }, headers: bearer(staff), now: MONDAY_10 });
    expect(confirm.body.data.status).toBe("confirmed");
    const invalid = await call("POST", `/admin/reservations/${r.body.data.reservation.reference}/status`, { body: { status: "completed" }, headers: bearer(staff) });
    expect(invalid.status).toBe(409);
    expect(invalid.body.error.code).toBe("INVALID_STATUS_TRANSITION");
  });

  it("modifies a reservation atomically and enforces the 2-hour cut-off", async () => {
    const r = await book({ date: "2026-11-02", time: "19:00", partySize: 2, customer: customer(50) });
    const ref = r.body.data.reservation.reference;
    const h = { "x-customer-phone": customer(50).phone };
    const moved = await call("PATCH", `/reservations/${ref}`, { body: { time: "20:00", partySize: 4, specialRequests: "Window if possible" }, headers: h, now: MONDAY_10 });
    expect(moved.status).toBe(200);
    expect(moved.body.data.reservation).toMatchObject({ time: "20:00", partySize: 4, specialRequests: "Window if possible", reference: ref });
    const tooLate = await call("PATCH", `/reservations/${ref}`, { body: { time: "20:15" }, headers: h, now: "2026-11-02T18:30:00+04:00" });
    expect(tooLate.body.error.code).toBe("MODIFICATION_WINDOW_CLOSED");
    const impossible = await call("PATCH", `/reservations/${ref}`, { body: { time: "23:30" }, headers: h, now: MONDAY_10 });
    expect(impossible.status).toBe(422);
    const still = await call("GET", `/reservations/${ref}`, { headers: h, now: MONDAY_10 });
    expect(still.body.data.time).toBe("20:00");
  });

  it("cancels a reservation and records late cancellations", async () => {
    const r = await book({ date: "2026-11-03", time: "19:00", partySize: 2, customer: customer(60) });
    const ref = r.body.data.reservation.reference;
    const c = await call("POST", `/reservations/${ref}/cancel`, { body: { reason: "Plans changed" }, headers: { "x-access-token": r.body.data.accessToken }, now: "2026-11-03T18:00:00+04:00" });
    expect(c.status).toBe(200);
    expect(c.body.data).toMatchObject({ lateCancellation: true, reservation: { status: "cancelled" } });
    const again = await call("POST", `/reservations/${ref}/cancel`, { body: {}, headers: { "x-access-token": r.body.data.accessToken }, now: MONDAY_10 });
    expect(again.body.error.code).toBe("RESERVATION_NOT_MODIFIABLE");
    // the freed table can be booked again
    const rebook = await book({ date: "2026-11-03", time: "19:00", partySize: 2, customer: customer(61) });
    expect(rebook.status).toBe(201);
  });

  it("replays idempotent retries and rejects key reuse with a different body", async () => {
    const body = { date: "2026-11-04", time: "13:00", partySize: 3, customer: customer(70) };
    const headers = { "idempotency-key": "retry-test-0001", ...bearer(AGENT_KEY) };
    const a = await book(body, { headers });
    const b = await book(body, { headers });
    expect(b.status).toBe(201);
    expect(b.headers.get("idempotent-replayed")).toBe("true");
    expect(b.body.data.reservation.reference).toBe(a.body.data.reservation.reference);
    const c = await book({ ...body, partySize: 4 }, { headers });
    expect(c.status).toBe(422);
    expect(c.body.error.code).toBe("IDEMPOTENCY_KEY_REUSED");
  });

  it("offers availability with other dates when a day is full for the party", async () => {
    const r = await call("GET", "/reservations/availability?date=2026-10-27&partySize=20&seatingPreference=majlis", { now: MONDAY_10 });
    expect(r.status).toBe(200);
    expect(r.body.data.requiresConfirmation).toBe(true);
    expect(r.body.data.slots.some((s: { areas: string[] }) => s.areas.includes("majlis"))).toBe(true);
    const tooLarge = await call("GET", "/reservations/availability?date=2026-10-27&partySize=30", { now: MONDAY_10 });
    expect(tooLarge.body.data).toMatchObject({ bookable: false });
    expect(tooLarge.body.data.violations[0].code).toBe("PARTY_TOO_LARGE");
  });
});
