"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Clock, MapPin, Users } from "lucide-react";
import { api, ApiClientError } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { addDaysIso, formatDateLong, formatIsoDateTime, todayInDubai } from "@/lib/format";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/fields";
import { Spinner } from "@/components/ui/spinner";
import { SlotPicker, type Slot } from "./slot-picker";

export interface ReservationDto {
  reference: string;
  status: string;
  statusLabel: string;
  statusDescription: string;
  confirmed: boolean;
  date: string;
  time: string;
  durationMinutes: number;
  partySize: number;
  seatingPreference: string;
  seatingAreaLabel: string;
  preferenceMet: boolean;
  customer: { name: string; phone: string; email: string | null };
  specialRequests: string | null;
  majlisMinimumSpendPerPerson: { formatted: string } | null;
  policies: { lateArrivalGraceMinutes: number; modifiableUntil: string; notes: string[] };
  allowedActions: { modify: boolean; cancel: boolean; reason: string | null };
  preOrders: { number: string; status: string }[];
}

export function ReservationView({ reference, auth }: { reference: string; auth: { token?: string | null; phone?: string | null } }) {
  const [res, setRes] = useState<ReservationDto | null>(null);
  const [error, setError] = useState<ApiClientError | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const headers: Record<string, string> = auth.token ? { "X-Access-Token": auth.token } : auth.phone ? { "X-Customer-Phone": auth.phone } : {};

  const load = useCallback(async () => {
    try {
      const r = await api<{ data: ReservationDto }>(`/reservations/${encodeURIComponent(reference)}`, { headers });
      setRes(r.data);
      setError(null);
    } catch (e) {
      setError(e as ApiClientError);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference, auth.token, auth.phone]);
  useEffect(() => {
    load();
  }, [load]);

  const cancel = async () => {
    if (!window.confirm("Cancel this reservation?")) return;
    setBusy(true);
    try {
      const r = await api<{ data: { reservation: ReservationDto; message: string } }>(`/reservations/${encodeURIComponent(reference)}/cancel`, { method: "POST", headers, json: { reason: "Cancelled on the website" } });
      setRes(r.data.reservation);
      setMessage(r.data.message);
    } catch (e) {
      setError(e as ApiClientError);
    } finally {
      setBusy(false);
    }
  };

  if (error && !res) {
    return (
      <Alert tone="error" title={error.body.code === "RECORD_NOT_FOUND" ? "We couldn't find that reservation" : "Something went wrong"}>
        {error.body.code === "RECORD_NOT_FOUND" ? "Check the reference and the phone number used to book." : error.message}
      </Alert>
    );
  }
  if (!res) return <div className="flex justify-center py-16"><Spinner label="Loading reservation" /></div>;
  const cancelled = ["cancelled", "rejected", "no_show"].includes(res.status);

  return (
    <div className="space-y-8">
      <div className={cn("rounded-3xl p-6 md:p-8", cancelled ? "bg-danger-50 ring-1 ring-[#efc4bd]" : res.confirmed ? "bg-success-50 ring-1 ring-[#c3dccb]" : "bg-warning-50 ring-1 ring-[#ecd3a5]")}>
        <p className="eyebrow">Reservation {res.reference}</p>
        <h2 className="mt-2 text-4xl md:text-5xl">{res.statusLabel}</h2>
        <p className="mt-3 max-w-2xl">{res.statusDescription}</p>
      </div>
      {message && <Alert tone="success">{message}</Alert>}
      <div className="grid gap-4 rounded-3xl bg-white p-6 ring-1 ring-sand-200 sm:grid-cols-2 md:p-8">
        <p className="flex items-center gap-3"><CalendarDays className="h-5 w-5 text-brass-700" aria-hidden="true" /> {formatDateLong(res.date)}</p>
        <p className="flex items-center gap-3"><Clock className="h-5 w-5 text-brass-700" aria-hidden="true" /> {res.time} · {res.durationMinutes} minutes</p>
        <p className="flex items-center gap-3"><Users className="h-5 w-5 text-brass-700" aria-hidden="true" /> {res.partySize} {res.partySize === 1 ? "guest" : "guests"} · {res.customer.name}</p>
        <p className="flex items-center gap-3"><MapPin className="h-5 w-5 text-brass-700" aria-hidden="true" /> {res.seatingAreaLabel}</p>
        {res.specialRequests && <p className="text-sm text-muted sm:col-span-2">Requests: {res.specialRequests}</p>}
        {res.majlisMinimumSpendPerPerson && <p className="text-sm text-muted sm:col-span-2">Majlis minimum spend: {res.majlisMinimumSpendPerPerson.formatted} per person.</p>}
        {res.preOrders.length > 0 && <p className="text-sm text-muted sm:col-span-2">Pre-orders: {res.preOrders.map((o) => `${o.number} (${o.status.replace(/_/g, " ")})`).join(", ")}</p>}
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted sm:col-span-2">
          {res.policies.notes.map((n) => <li key={n}>{n}</li>)}
        </ul>
      </div>
      {error && <Alert tone="error">{error.message}</Alert>}
      {!cancelled && (
        <div className="flex flex-wrap items-center gap-3">
          {res.allowedActions.modify && <Button variant="outline" onClick={() => setEditing((v) => !v)}>{editing ? "Close" : "Change booking"}</Button>}
          {res.allowedActions.cancel && <Button variant="danger" onClick={cancel} disabled={busy}>{busy ? <Spinner /> : "Cancel reservation"}</Button>}
          {!res.allowedActions.modify && res.allowedActions.reason && <p className="text-sm text-muted">{res.allowedActions.reason}</p>}
          {res.allowedActions.modify && <p className="text-sm text-muted">Changes possible until {formatIsoDateTime(res.policies.modifiableUntil)}.</p>}
        </div>
      )}
      {editing && <ModifyForm res={res} headers={headers} onDone={(r, m) => { setRes(r); setMessage(m); setEditing(false); }} />}
    </div>
  );
}

function ModifyForm({ res, headers, onDone }: { res: ReservationDto; headers: Record<string, string>; onDone: (r: ReservationDto, message: string) => void }) {
  const [date, setDate] = useState(res.date);
  const [partySize, setPartySize] = useState(res.partySize);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = todayInDubai();

  const check = async () => {
    setBusy(true);
    setError(null);
    try {
      const params = new URLSearchParams({ date, partySize: String(partySize), seatingPreference: res.seatingPreference });
      const r = await api<{ data: { slots: Slot[]; violations: { message: string }[] } }>(`/reservations/availability?${params}`);
      setSlots(r.data.slots);
      if (r.data.violations.length) setError(r.data.violations.map((v) => v.message).join(" "));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const save = async () => {
    if (!time) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ data: { reservation: ReservationDto; message: string } }>(`/reservations/${res.reference}`, { method: "PATCH", headers, json: { date, time, partySize } });
      onDone(r.data.reservation, r.data.message);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };
  return (
    <div className="space-y-5 rounded-3xl bg-white p-6 ring-1 ring-sand-200">
      <div className="flex flex-wrap items-end gap-4">
        <Field label="New date" htmlFor="m-date"><Input id="m-date" type="date" min={today} max={addDaysIso(today, 60)} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Guests" htmlFor="m-party">
          <Select id="m-party" value={partySize} onChange={(e) => setPartySize(Number(e.target.value))}>
            {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
          </Select>
        </Field>
        <Button variant="outline" onClick={check} disabled={busy}>Show times</Button>
      </div>
      {error && <Alert tone="warning">{error}</Alert>}
      {slots && <SlotPicker slots={slots} value={time} onChange={setTime} preference={res.seatingPreference} partySize={partySize} />}
      {time && <Button onClick={save} disabled={busy}>{busy ? <Spinner /> : `Move to ${date} at ${time}`}</Button>}
    </div>
  );
}
