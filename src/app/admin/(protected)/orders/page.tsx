"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { allowedOrderTransitions, ORDER_STATUSES, type OrderStatus } from "@/domain/status";
import type { OrderType } from "@/domain/types";
import { api, ApiClientError } from "@/lib/api-client";
import { formatIsoDateTime } from "@/lib/format";
import { AdminHeader, Card, StatusPill } from "@/components/admin/ui";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/fields";
import { Spinner } from "@/components/ui/spinner";

interface Ord {
  number: string; kind: string; type: OrderType; status: OrderStatus; channel: string;
  fulfilment: { promisedAt: string };
  customer: { name: string; phone: string; email: string | null };
  recipient: { name: string } | null;
  items: { id: string; name: string; quantity: number; options: { name: string }[]; lineTotal: { formatted: string }; status: string; allergens: string[] }[];
  totals: { total: { formatted: string } };
  specialInstructions: string | null; allergyNoteFlagged: boolean; reviewReason: string | null;
  deliveryAddress: Record<string, string> | null; reservationReference: string | null;
  payment: { methodLabel: string };
  history: { at: string; status: string | null; note: string | null; actor: string }[];
}

export default function AdminOrders() {
  const [filters, setFilters] = useState({ date: "", status: "", kind: typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("kind") ?? "" : "", q: "" });
  const [rows, setRows] = useState<Ord[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    const p = new URLSearchParams({ pageSize: "100" });
    Object.entries(filters).forEach(([k, v]) => v && p.set(k, v));
    try {
      setRows((await api<{ data: Ord[] }>(`/admin/orders?${p}`)).data);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [filters]);
  useEffect(() => {
    load();
  }, [load]);

  const act = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setError((e as ApiClientError).message);
    }
  };

  return (
    <>
      <AdminHeader title="Orders" subtitle="Pickup, delivery, dine-in pre-orders and catering" />
      <Card className="mb-4 grid gap-3 md:grid-cols-4">
        <Input type="date" aria-label="Date" value={filters.date} onChange={(e) => setFilters({ ...filters, date: e.target.value })} />
        <Select aria-label="Status" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
        </Select>
        <Select aria-label="Kind" value={filters.kind} onChange={(e) => setFilters({ ...filters, kind: e.target.value })}>
          <option value="">Regular & catering</option><option value="regular">Regular</option><option value="bulk">Catering</option>
        </Select>
        <Input placeholder="Search number, name, phone" aria-label="Search" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
      </Card>
      {error && <Alert tone="error" className="mb-4">{error}</Alert>}
      {!rows ? <Spinner /> : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-sand-50 text-left text-xs tracking-wide text-muted uppercase"><tr><th className="p-3">Time</th><th className="p-3">Order</th><th className="p-3">Customer</th><th className="p-3">Total</th><th className="p-3">Status</th><th className="p-3" /></tr></thead>
            <tbody className="divide-y divide-sand-200">
              {rows.map((o) => (
                <Fragment key={o.number}>
                  <tr className="align-top">
                    <td className="p-3 tabular-nums">{formatIsoDateTime(o.fulfilment.promisedAt)}</td>
                    <td className="p-3">{o.number}<span className="block text-xs text-muted">{o.kind === "bulk" ? "catering · " : ""}{o.type.replace(/_/g, " ")} · {o.channel}</span></td>
                    <td className="p-3">{o.customer.name}<span className="block text-xs text-muted">{o.customer.phone}</span>{o.allergyNoteFlagged && <span className="mt-1 block text-xs font-medium text-danger-700">Allergy note — call customer</span>}</td>
                    <td className="p-3 tabular-nums">{o.totals.total.formatted}</td>
                    <td className="p-3"><StatusPill status={o.status} /></td>
                    <td className="p-3 text-right"><button type="button" className="text-sm underline" onClick={() => setOpen(open === o.number ? null : o.number)}>{open === o.number ? "Close" : "Details"}</button></td>
                  </tr>
                  {open === o.number && (
                    <tr className="bg-sand-50">
                      <td colSpan={6} className="p-4">
                        <div className="grid gap-6 md:grid-cols-3">
                          <div>
                            <p className="eyebrow mb-2">Items</p>
                            <ul className="space-y-2">
                              {o.items.map((i) => (
                                <li key={i.id} className={i.status === "removed" ? "text-muted line-through" : ""}>
                                  {i.quantity} × {i.name} <span className="text-muted">{i.lineTotal.formatted}</span>
                                  {i.options.length > 0 && <span className="block text-xs text-muted">{i.options.map((x) => x.name).join(" · ")}</span>}
                                  {i.status === "active" && ["pending_confirmation", "confirmed", "preparing"].includes(o.status) && (
                                    <button type="button" className="ml-2 text-xs text-danger-700 underline" onClick={() => {
                                      const reason = window.prompt(`Why is ${i.name} unavailable?`, "Sold out");
                                      if (reason) act(() => api(`/admin/orders/${o.number}/lines/${i.id}/remove`, { method: "POST", json: { reason } }));
                                    }}>mark unavailable</button>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="space-y-1 text-sm">
                            <p className="eyebrow mb-2">Details</p>
                            <p>{o.payment.methodLabel}</p>
                            {o.recipient && <p>For: {o.recipient.name}</p>}
                            {o.reservationReference && <p>Reservation {o.reservationReference}</p>}
                            {o.deliveryAddress && <p>{Object.values(o.deliveryAddress).filter(Boolean).join(", ")}</p>}
                            {o.specialInstructions && <p className="italic">“{o.specialInstructions}”</p>}
                            {o.reviewReason && <p className="text-warning-700">{o.reviewReason}</p>}
                          </div>
                          <div>
                            <p className="eyebrow mb-2">Move to</p>
                            <div className="flex flex-wrap gap-2">
                              {allowedOrderTransitions(o.status, o.type).map((s) => (
                                <Button key={s} size="sm" variant={["cancelled", "rejected", "not_collected", "delivery_failed"].includes(s) ? "danger" : "outline"} onClick={() => act(() => api(`/admin/orders/${o.number}/status`, { method: "POST", json: { status: s } }))}>
                                  {s.replace(/_/g, " ")}
                                </Button>
                              ))}
                            </div>
                            <p className="eyebrow mb-2 mt-4">History</p>
                            <ul className="space-y-1 text-xs text-muted">{o.history.map((h, k) => <li key={k}>{formatIsoDateTime(h.at)} · {h.status ?? ""} · {h.actor}{h.note ? ` — ${h.note}` : ""}</li>)}</ul>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {rows.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted">No orders match.</td></tr>}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
