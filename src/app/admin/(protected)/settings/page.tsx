"use client";

import { useEffect, useState } from "react";
import { api, ApiClientError } from "@/lib/api-client";
import { AdminHeader, Card } from "@/components/admin/ui";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/fields";

type Settings = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export default function AdminSettings() {
  const [s, setS] = useState<Settings | null>(null);
  const [json, setJson] = useState("");
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const load = async () => {
    const r = await api<{ data: { settings: Settings; version: number } }>("/admin/settings");
    setS(r.data.settings);
    setJson(JSON.stringify(r.data.settings, null, 2));
  };
  useEffect(() => {
    load();
  }, []);
  const save = async (patch: Settings, label: string) => {
    setMsg(null);
    try {
      await api("/admin/settings", { method: "PATCH", json: patch });
      setMsg({ tone: "success", text: label });
      await load();
    } catch (e) {
      const err = e as ApiClientError;
      const issues = (err.body.details?.issues as { path: string; message: string }[] | undefined)?.map((i) => `${i.path}: ${i.message}`).join("; ");
      setMsg({ tone: "error", text: `${err.message}${issues ? ` ${issues}` : ""}` });
    }
  };
  if (!s) return null;
  const toggles: [string, string, boolean][] = [
    ["ordering.acceptingOrders", "Accepting online & phone orders", s.ordering.acceptingOrders],
    ["ordering.autoConfirm", "Auto-confirm orders (otherwise all pending)", s.ordering.autoConfirm],
    ["delivery.enabled", "Delivery enabled", s.delivery.enabled],
    ["reservations.acceptingReservations", "Accepting reservations", s.reservations.acceptingReservations],
    ["reservations.terraceOpen", "Terrace open (weather)", s.reservations.terraceOpen],
    ["bulk.acceptingBulkOrders", "Accepting catering orders", s.bulk.acceptingBulkOrders],
  ];
  const nest = (path: string, value: unknown) => path.split(".").reduceRight<unknown>((acc, k) => ({ [k]: acc }), value) as Settings;
  return (
    <>
      <AdminHeader title="Settings" subtitle="Operational switches and limits. Every change is validated and recorded in the audit log." />
      {msg && <Alert tone={msg.tone} className="mb-4">{msg.text}</Alert>}
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-2xl">Switches</h2>
          <ul className="space-y-3">
            {toggles.map(([path, label, value]) => (
              <li key={path} className="flex items-center justify-between gap-3">
                <span className="text-sm">{label}</span>
                <button type="button" role="switch" aria-checked={value} aria-label={label} onClick={() => save(nest(path, !value), `${label}: ${!value ? "on" : "off"}`)} className={`relative h-6 w-11 rounded-full transition ${value ? "bg-success-700" : "bg-sand-300"}`}>
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${value ? "left-5" : "left-0.5"}`} />
                </button>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="mb-4 text-2xl">Announcement</h2>
          <form onSubmit={(e) => { e.preventDefault(); const v = (new FormData(e.currentTarget).get("a") as string).trim(); save({ announcement: v || null }, "Announcement saved"); }}>
            <Field label="Banner shown on every page (blank to hide)" htmlFor="a"><Input id="a" name="a" defaultValue={s.announcement ?? ""} maxLength={280} /></Field>
            <Button className="mt-3" size="sm" type="submit">Save</Button>
          </form>
          <h2 className="mb-4 mt-8 text-2xl">Kitchen capacity</h2>
          <form className="grid grid-cols-2 gap-3" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); save({ ordering: { slotCapacityPortions: Number(f.get("cap")), maxOrdersPerSlot: Number(f.get("orders")), minLeadMinutes: Number(f.get("lead")), maxPortionsPerOrder: Number(f.get("max")) } }, "Capacity saved"); }}>
            <Field label="Portions per 15-min slot" htmlFor="cap"><Input id="cap" name="cap" type="number" defaultValue={s.ordering.slotCapacityPortions} /></Field>
            <Field label="Orders per slot" htmlFor="orders"><Input id="orders" name="orders" type="number" defaultValue={s.ordering.maxOrdersPerSlot} /></Field>
            <Field label="Minimum lead (min)" htmlFor="lead"><Input id="lead" name="lead" type="number" defaultValue={s.ordering.minLeadMinutes} /></Field>
            <Field label="Max portions / regular order" htmlFor="max"><Input id="max" name="max" type="number" defaultValue={s.ordering.maxPortionsPerOrder} /></Field>
            <div className="col-span-2"><Button size="sm" type="submit">Save capacity</Button></div>
          </form>
        </Card>
        <Card className="xl:col-span-2">
          <h2 className="mb-2 text-2xl">All settings (advanced)</h2>
          <p className="mb-3 text-sm text-muted">Full JSON, including weekly hours, delivery zones, reservation durations and catering tiers. Saved as a whole and validated by the server.</p>
          <Textarea aria-label="Settings JSON" value={json} onChange={(e) => setJson(e.target.value)} className="min-h-[420px] font-mono text-xs" />
          <Button className="mt-3" onClick={() => { try { save(JSON.parse(json), "Settings saved"); } catch { setMsg({ tone: "error", text: "That is not valid JSON." }); } }}>Save all settings</Button>
        </Card>
      </div>
    </>
  );
}
