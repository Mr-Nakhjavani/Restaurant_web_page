"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { api, ApiClientError, newIdempotencyKey } from "@/lib/api-client";
import { addDaysIso, formatDateLong, todayInDubai } from "@/lib/format";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, RadioCard, Select, Textarea } from "@/components/ui/fields";
import { Spinner } from "@/components/ui/spinner";
import { SlotPicker, type Slot } from "./slot-picker";
import { rememberReservation } from "./recent-reservations";

interface Availability {
  date: string;
  weekday: string;
  bookable: boolean;
  violations: { code: string; message: string }[];
  durationMinutes: number;
  seatingHours: string;
  terraceAvailable: boolean;
  requested: { time: string; available: boolean; reasons: { message: string }[] } | null;
  slots: Slot[];
  alternatives: Slot[];
  otherDates: { date: string; weekday: string; times: string[] }[];
  requiresConfirmation: boolean;
  notes: string[];
}

const PREFS = [
  { id: "no_preference", title: "No preference", desc: "Best available table" },
  { id: "indoor", title: "Main hall", desc: "Indoors, air-conditioned" },
  { id: "window", title: "Creek window", desc: "Indoors, facing the water" },
  { id: "terrace", title: "Terrace", desc: "Outdoors · mid-Oct to April" },
  { id: "majlis", title: "Private majlis", desc: "6–20 guests · floor seating · 24 h notice" },
];

export function BookingFlow() {
  const router = useRouter();
  const today = todayInDubai();
  const [date, setDate] = useState(addDaysIso(today, 1));
  const [partySize, setPartySize] = useState(2);
  const [preferredTime, setPreferredTime] = useState("19:30");
  const [preference, setPreference] = useState("no_preference");
  const [wheelchair, setWheelchair] = useState(false);
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [checking, setChecking] = useState(false);
  const [time, setTime] = useState<string | null>(null);
  const [details, setDetails] = useState({ name: "", phone: "", email: "", occasion: "", childrenCount: 0, highChairs: 0, specialRequests: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<ApiClientError | null>(null);
  const idem = useRef(newIdempotencyKey("web-res"));

  const check = async (d = date) => {
    setChecking(true);
    setError(null);
    setTime(null);
    try {
      const params = new URLSearchParams({ date: d, partySize: String(partySize), seatingPreference: preference, time: preferredTime });
      if (wheelchair) params.set("wheelchair", "true");
      const r = await api<{ data: Availability }>(`/reservations/availability?${params}`);
      setAvailability(r.data);
      if (r.data.requested?.available) setTime(preferredTime);
    } catch (e) {
      setError(e as ApiClientError);
    } finally {
      setChecking(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!time) return;
    setSubmitting(true);
    setError(null);
    try {
      const r = await api<{ data: { reservation: { reference: string }; accessToken: string } }>("/reservations", {
        method: "POST",
        headers: { "Idempotency-Key": idem.current },
        json: {
          date,
          time,
          partySize,
          seatingPreference: preference,
          customer: { name: details.name.trim(), phone: details.phone.trim(), ...(details.email.trim() ? { email: details.email.trim() } : {}) },
          ...(details.occasion ? { occasion: details.occasion } : {}),
          ...(details.childrenCount ? { childrenCount: details.childrenCount } : {}),
          ...(details.highChairs ? { highChairs: details.highChairs } : {}),
          ...(details.specialRequests.trim() ? { specialRequests: details.specialRequests.trim() } : {}),
          ...(wheelchair ? { wheelchairAccess: true } : {}),
        },
      });
      rememberReservation(r.data.reservation.reference, r.data.accessToken);
      router.push(`/reservations/confirmation/${r.data.reservation.reference}#t=${encodeURIComponent(r.data.accessToken)}`);
    } catch (err) {
      setError(err as ApiClientError);
      idem.current = newIdempotencyKey("web-res");
      setSubmitting(false);
    }
  };

  const times = useMemo(() => {
    const out: string[] = [];
    for (let m = 8 * 60; m <= 22 * 60 + 30; m += 15) out.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
    return out;
  }, []);

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
      <form
        className="h-fit space-y-6 rounded-3xl bg-white p-6 ring-1 ring-sand-200 md:p-8"
        onSubmit={(e) => {
          e.preventDefault();
          check();
        }}
      >
        <h2 className="text-3xl">Find a table</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Date" htmlFor="r-date">
            <Input id="r-date" type="date" min={today} max={addDaysIso(today, 60)} value={date} onChange={(e) => setDate(e.target.value)} required />
          </Field>
          <Field label="Guests" htmlFor="r-party">
            <Select id="r-party" value={partySize} onChange={(e) => setPartySize(Number(e.target.value))}>
              {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n} {n === 1 ? "guest" : "guests"}</option>
              ))}
            </Select>
          </Field>
          <Field label="Preferred time" htmlFor="r-time">
            <Select id="r-time" value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)}>
              {times.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </Field>
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-date-800">Seating</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {PREFS.map((p) => (
              <RadioCard key={p.id} name="pref" value={p.id} checked={preference === p.id} onChange={setPreference} title={p.title} description={p.desc} />
            ))}
          </div>
        </fieldset>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={wheelchair} onChange={(e) => setWheelchair(e.target.checked)} className="h-4 w-4 accent-[#43291c]" />
          A guest uses a wheelchair (step-free tables only)
        </label>
        <Button type="submit" className="w-full" disabled={checking}>{checking ? <Spinner label="Checking" /> : "Check availability"}</Button>
        <p className="text-xs text-muted">Parties of more than 20, private hire and buy-outs: events@baytalghaf.example. Walk-ins are welcome when tables are free.</p>
      </form>

      <div aria-live="polite">
        {!availability && !error && (
          <div className="rounded-3xl border border-dashed border-sand-300 p-10 text-center text-muted">
            <p className="font-display text-3xl text-date-800">Choose a date and party size</p>
            <p className="mt-2">We will show every time with a free table, held for {"you"} the moment you confirm.</p>
          </div>
        )}
        {error && <Alert tone="error" title="We could not complete that" className="mb-6">{error.message}</Alert>}
        {availability && (
          <div className="space-y-6">
            <div>
              <p className="eyebrow">{formatDateLong(availability.date)}</p>
              <h2 className="mt-2 text-3xl">{partySize} {partySize === 1 ? "guest" : "guests"} · tables are booked for {availability.durationMinutes} minutes</h2>
              <p className="mt-2 text-sm text-muted">{availability.seatingHours}</p>
            </div>
            {availability.violations.map((v) => (
              <Alert key={v.code} tone="warning">{v.message}</Alert>
            ))}
            {availability.requested && !availability.requested.available && availability.bookable && (
              <Alert tone="info">{preferredTime} isn&apos;t available{preference !== "no_preference" ? ` for that seating area` : ""}. Nearest times: {availability.alternatives.map((a) => a.time).join(", ") || "none on this day"}.</Alert>
            )}
            {availability.slots.length > 0 && <SlotPicker slots={availability.slots} value={time} onChange={setTime} preference={preference} partySize={partySize} />}
            {availability.otherDates.length > 0 && (
              <div>
                <p className="eyebrow mb-2">Other days</p>
                <div className="flex flex-wrap gap-2">
                  {availability.otherDates.map((d) => (
                    <button key={d.date} type="button" onClick={() => { setDate(d.date); check(d.date); }} className="rounded-full bg-white px-4 py-2 text-sm ring-1 ring-sand-300 hover:bg-sand-100">
                      {d.weekday.slice(0, 3)} {d.date.slice(8)}/{d.date.slice(5, 7)} · {d.times.join(", ")}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {availability.requiresConfirmation && <Alert tone="info">Groups of this size are held as a request and confirmed by our team by phone.</Alert>}

            {time && (
              <form onSubmit={submit} className="space-y-4 rounded-3xl bg-white p-6 ring-1 ring-sand-200 md:p-8">
                <h3 className="text-2xl">Your details · {time}</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Name for the booking" htmlFor="b-name" required>
                    <Input id="b-name" required minLength={2} value={details.name} onChange={(e) => setDetails({ ...details, name: e.target.value })} autoComplete="name" />
                  </Field>
                  <Field label="Mobile number" htmlFor="b-phone" required hint="Required — we confirm and contact you on this number">
                    <Input id="b-phone" required type="tel" value={details.phone} onChange={(e) => setDetails({ ...details, phone: e.target.value })} autoComplete="tel" />
                  </Field>
                  <Field label="E-mail (optional)" htmlFor="b-email">
                    <Input id="b-email" type="email" value={details.email} onChange={(e) => setDetails({ ...details, email: e.target.value })} autoComplete="email" />
                  </Field>
                  <Field label="Occasion (optional)" htmlFor="b-occ">
                    <Select id="b-occ" value={details.occasion} onChange={(e) => setDetails({ ...details, occasion: e.target.value })}>
                      <option value="">None</option>
                      <option value="birthday">Birthday</option>
                      <option value="anniversary">Anniversary</option>
                      <option value="family_gathering">Family gathering</option>
                      <option value="business">Business</option>
                      <option value="celebration">Celebration</option>
                    </Select>
                  </Field>
                  <Field label="Children in the party" htmlFor="b-kids">
                    <Select id="b-kids" value={details.childrenCount} onChange={(e) => setDetails({ ...details, childrenCount: Number(e.target.value) })}>
                      {Array.from({ length: Math.min(partySize, 10) + 1 }, (_, i) => <option key={i} value={i}>{i}</option>)}
                    </Select>
                  </Field>
                  <Field label="High chairs" htmlFor="b-hc">
                    <Select id="b-hc" value={details.highChairs} onChange={(e) => setDetails({ ...details, highChairs: Number(e.target.value) })}>
                      {[0, 1, 2, 3, 4].map((i) => <option key={i} value={i}>{i}</option>)}
                    </Select>
                  </Field>
                  <Field label="Requests (optional)" htmlFor="b-req" className="sm:col-span-2" hint="Allergies, accessibility, a cake for the table (AED 30 plating fee)…">
                    <Textarea id="b-req" maxLength={500} value={details.specialRequests} onChange={(e) => setDetails({ ...details, specialRequests: e.target.value })} />
                  </Field>
                </div>
                <Button type="submit" size="lg" className="w-full" disabled={submitting}>{submitting ? <Spinner label="Booking" /> : `Confirm table for ${partySize} at ${time}`}</Button>
                <p className="text-center text-xs text-muted">Free cancellation any time before your booking. We hold tables for 15 minutes.</p>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
