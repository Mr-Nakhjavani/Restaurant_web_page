"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiClientError } from "@/lib/api-client";
import { AdminHeader, Card } from "@/components/admin/ui";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/fields";

interface Period { id: string; slug: string; type: string; name: string; startDate: string; endDate: string; provisional: boolean; notes: string; hoursOverride: { open: string; close: string } | null }
interface Closure { id: string; date: string; startTime: string | null; endTime: string | null; scope: string; reason: string; publicNote: string }

export default function AdminCalendar() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [closures, setClosures] = useState<Closure[]>([]);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [newClosure, setNewClosure] = useState({ date: "", startTime: "", endTime: "", scope: "all", reason: "", publicNote: "" });
  const load = useCallback(async () => {
    setPeriods((await api<{ data: Period[] }>("/admin/special-periods")).data);
    setClosures((await api<{ data: Closure[] }>("/admin/closures")).data);
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setMsg(null);
    try {
      await fn();
      setMsg({ tone: "success", text: ok });
      await load();
    } catch (e) {
      setMsg({ tone: "error", text: (e as ApiClientError).message });
    }
  };
  return (
    <>
      <AdminHeader title="Calendar & closures" subtitle="Special periods drive special-day menus (Ramadan, National Day, seasons) and opening-hour overrides." />
      {msg && <Alert tone={msg.tone} className="mb-4">{msg.text}</Alert>}
      <div className="space-y-4">
        {periods.map((p) => <PeriodEditor key={p.id} period={p} onSave={(body) => run(() => api(`/admin/special-periods/${p.id}`, { method: "PATCH", json: body }), `${p.name} saved`)} />)}
      </div>
      <h2 className="mb-3 mt-10 text-3xl">Closures & blackouts</h2>
      <Card className="mb-4 overflow-x-auto p-0">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="bg-sand-50 text-left text-xs tracking-wide text-muted uppercase"><tr><th className="p-3">Date</th><th className="p-3">Time</th><th className="p-3">Applies to</th><th className="p-3">Reason</th><th className="p-3" /></tr></thead>
          <tbody className="divide-y divide-sand-200">
            {closures.map((c) => (
              <tr key={c.id}><td className="p-3">{c.date}</td><td className="p-3">{c.startTime ?? "all day"}–{c.endTime ?? "close"}</td><td className="p-3">{c.scope}</td><td className="p-3">{c.reason}<span className="block text-xs text-muted">{c.publicNote}</span></td>
                <td className="p-3 text-right"><Button size="sm" variant="danger" onClick={() => window.confirm("Remove this closure?") && run(() => api(`/admin/closures/${c.id}`, { method: "DELETE" }), "Closure removed")}>Remove</Button></td></tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card>
        <form className="grid gap-3 md:grid-cols-3" onSubmit={(e) => { e.preventDefault(); run(() => api("/admin/closures", { method: "POST", json: { ...newClosure, startTime: newClosure.startTime || null, endTime: newClosure.endTime || null } }), "Closure added"); }}>
          <Field label="Date" htmlFor="c-d"><Input id="c-d" type="date" required value={newClosure.date} onChange={(e) => setNewClosure({ ...newClosure, date: e.target.value })} /></Field>
          <Field label="From (blank = all day)" htmlFor="c-s"><Input id="c-s" type="time" step={900} value={newClosure.startTime} onChange={(e) => setNewClosure({ ...newClosure, startTime: e.target.value })} /></Field>
          <Field label="Until (blank = close)" htmlFor="c-e"><Input id="c-e" type="time" step={900} value={newClosure.endTime} onChange={(e) => setNewClosure({ ...newClosure, endTime: e.target.value })} /></Field>
          <Field label="Applies to" htmlFor="c-sc"><Select id="c-sc" value={newClosure.scope} onChange={(e) => setNewClosure({ ...newClosure, scope: e.target.value })}><option value="all">Everything</option><option value="reservations">Dining room only</option><option value="orders">Takeaway & delivery only</option></Select></Field>
          <Field label="Internal reason" htmlFor="c-r"><Input id="c-r" required value={newClosure.reason} onChange={(e) => setNewClosure({ ...newClosure, reason: e.target.value })} /></Field>
          <Field label="Public note" htmlFor="c-n"><Input id="c-n" required value={newClosure.publicNote} onChange={(e) => setNewClosure({ ...newClosure, publicNote: e.target.value })} /></Field>
          <div className="md:col-span-3"><Button type="submit">Add closure</Button></div>
        </form>
      </Card>
    </>
  );
}

function PeriodEditor({ period, onSave }: { period: Period; onSave: (body: Record<string, unknown>) => void }) {
  const [p, setP] = useState(period);
  return (
    <Card>
      <form className="grid gap-3 md:grid-cols-6 md:items-end" onSubmit={(e) => { e.preventDefault(); onSave({ slug: p.slug, type: p.type, name: p.name, startDate: p.startDate, endDate: p.endDate, provisional: p.provisional, notes: p.notes, hoursOverride: p.hoursOverride }); }}>
        <div className="md:col-span-2"><p className="font-display text-xl">{p.name}</p><p className="text-xs text-muted">{p.type.replace(/_/g, " ")} · {p.notes}</p></div>
        <Field label="From" htmlFor={`${p.id}-s`}><Input id={`${p.id}-s`} type="date" value={p.startDate} onChange={(e) => setP({ ...p, startDate: e.target.value })} /></Field>
        <Field label="To" htmlFor={`${p.id}-e`}><Input id={`${p.id}-e`} type="date" value={p.endDate} onChange={(e) => setP({ ...p, endDate: e.target.value })} /></Field>
        <label className="flex items-center gap-2 pb-3 text-sm"><input type="checkbox" checked={p.provisional} onChange={(e) => setP({ ...p, provisional: e.target.checked })} className="h-4 w-4 accent-[#43291c]" /> Provisional</label>
        <Button type="submit" size="sm">Save</Button>
      </form>
    </Card>
  );
}
