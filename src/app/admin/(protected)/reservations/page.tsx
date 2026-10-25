"use client";

import { useCallback, useEffect, useState } from "react";
import { allowedReservationTransitions, RESERVATION_STATUSES, type ReservationStatus } from "@/domain/status";
import { api, ApiClientError } from "@/lib/api-client";
import { todayInDubai } from "@/lib/format";
import { AdminHeader, Card, StatusPill } from "@/components/admin/ui";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/fields";
import { Spinner } from "@/components/ui/spinner";

interface Res {
  reference: string; status: ReservationStatus; date: string; time: string; partySize: number; seatingAreaLabel: string; tableCode: string | null; preferenceMet: boolean;
  customer: { name: string; phone: string }; specialRequests: string | null; occasion: string | null; childrenCount: number; highChairs: number; wheelchairAccess: boolean; channel: string;
  preOrders: { number: string }[];
}

export default function AdminReservations() {
  const [date, setDate] = useState(todayInDubai());
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Res[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    const p = new URLSearchParams({ pageSize: "100" });
    if (date) p.set("date", date);
    if (status) p.set("status", status);
    if (q) p.set("q", q);
    setRows((await api<{ data: Res[] }>(`/admin/reservations?${p}`)).data);
  }, [date, status, q]);
  useEffect(() => {
    load().catch((e) => setError((e as Error).message));
  }, [load]);
  const move = async (ref: string, s: string) => {
    setError(null);
    try {
      await api(`/admin/reservations/${ref}/status`, { method: "POST", json: { status: s } });
      await load();
    } catch (e) {
      setError((e as ApiClientError).message);
    }
  };
  return (
    <>
      <AdminHeader title="Reservations" subtitle="Confirm large groups, seat guests, record no-shows" />
      <Card className="mb-4 grid gap-3 md:grid-cols-3">
        <Input type="date" aria-label="Date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {RESERVATION_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
        </Select>
        <Input placeholder="Search reference, name, phone" aria-label="Search" value={q} onChange={(e) => setQ(e.target.value)} />
      </Card>
      {error && <Alert tone="error" className="mb-4">{error}</Alert>}
      {!rows ? <Spinner /> : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-sand-50 text-left text-xs tracking-wide text-muted uppercase"><tr><th className="p-3">Time</th><th className="p-3">Guest</th><th className="p-3">Party</th><th className="p-3">Table</th><th className="p-3">Notes</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr></thead>
            <tbody className="divide-y divide-sand-200">
              {rows.map((r) => (
                <tr key={r.reference} className="align-top">
                  <td className="p-3 tabular-nums">{r.time}<span className="block text-xs text-muted">{r.date}</span></td>
                  <td className="p-3">{r.customer.name}<span className="block text-xs text-muted">{r.reference} · {r.customer.phone} · {r.channel}</span></td>
                  <td className="p-3">{r.partySize}{r.childrenCount ? <span className="block text-xs text-muted">{r.childrenCount} children · {r.highChairs} high chairs</span> : null}</td>
                  <td className="p-3">{r.tableCode}<span className="block text-xs text-muted">{r.seatingAreaLabel}</span></td>
                  <td className="p-3 text-xs text-muted">{[r.occasion, r.wheelchairAccess ? "wheelchair" : null, r.specialRequests, r.preOrders.length ? `pre-order ${r.preOrders.map((o) => o.number).join(", ")}` : null].filter(Boolean).join(" · ") || "—"}</td>
                  <td className="p-3"><StatusPill status={r.status} /></td>
                  <td className="p-3"><div className="flex flex-wrap gap-1">{allowedReservationTransitions(r.status).map((s) => <Button key={s} size="sm" variant={["cancelled", "rejected", "no_show"].includes(s) ? "danger" : "outline"} onClick={() => move(r.reference, s)}>{s.replace(/_/g, " ")}</Button>)}</div></td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted">No reservations.</td></tr>}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
