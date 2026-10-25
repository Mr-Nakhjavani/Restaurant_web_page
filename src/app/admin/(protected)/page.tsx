"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { formatDateLong, todayInDubai } from "@/lib/format";
import { AdminHeader, Card, StatusPill } from "@/components/admin/ui";
import { Input } from "@/components/ui/fields";
import { Spinner } from "@/components/ui/spinner";

interface Dashboard {
  orders: { byStatus: Record<string, number>; total: number; expectedRevenue: { formatted: string } };
  reservations: { byStatus: Record<string, number>; total: number; covers: number };
  needsAttention: { pendingOrders: number; pendingReservations: number; upcomingCateringOrders: number };
}
interface Res { reference: string; time: string; partySize: number; customer: { name: string }; seatingAreaLabel: string; status: string; tableCode: string | null; specialRequests: string | null }
interface Ord { number: string; kind: string; type: string; status: string; fulfilment: { time: string; date: string }; customer: { name: string }; totals: { total: { formatted: string } }; items: { quantity: number; name: string }[] }

export default function AdminDashboard() {
  const [date, setDate] = useState(todayInDubai());
  const [d, setD] = useState<Dashboard | null>(null);
  const [res, setRes] = useState<Res[]>([]);
  const [orders, setOrders] = useState<Ord[]>([]);
  useEffect(() => {
    setD(null);
    Promise.all([
      api<{ data: Dashboard }>(`/admin/dashboard?date=${date}`),
      api<{ data: Res[] }>(`/admin/reservations?date=${date}&pageSize=100`),
      api<{ data: Ord[] }>(`/admin/orders?date=${date}&pageSize=100`),
    ]).then(([a, b, c]) => {
      setD(a.data);
      setRes(b.data);
      setOrders(c.data);
    });
  }, [date]);
  return (
    <>
      <AdminHeader title="Today" subtitle={formatDateLong(date)} actions={<Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="!w-auto" aria-label="Date" />} />
      {!d ? (
        <Spinner />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card><p className="eyebrow">Reservations</p><p className="mt-2 font-display text-4xl">{d.reservations.total}</p><p className="text-sm text-muted">{d.reservations.covers} covers</p></Card>
            <Card><p className="eyebrow">Orders</p><p className="mt-2 font-display text-4xl">{d.orders.total}</p><p className="text-sm text-muted">{d.orders.expectedRevenue.formatted} expected</p></Card>
            <Card className={d.needsAttention.pendingOrders + d.needsAttention.pendingReservations > 0 ? "ring-warning-700/40" : ""}>
              <p className="eyebrow">Needs confirmation</p>
              <p className="mt-2 font-display text-4xl">{d.needsAttention.pendingOrders + d.needsAttention.pendingReservations}</p>
              <p className="text-sm text-muted">{d.needsAttention.pendingOrders} orders · {d.needsAttention.pendingReservations} reservations</p>
            </Card>
            <Card><p className="eyebrow">Upcoming catering</p><p className="mt-2 font-display text-4xl">{d.needsAttention.upcomingCateringOrders}</p><Link href="/admin/orders?kind=bulk" className="text-sm underline">View</Link></Card>
          </div>
          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <div className="mb-3 flex items-center justify-between"><h2 className="text-2xl">Reservations</h2><Link href="/admin/reservations" className="text-sm underline">Manage</Link></div>
              {res.length === 0 ? <p className="text-sm text-muted">No reservations.</p> : (
                <table className="w-full text-sm"><tbody className="divide-y divide-sand-200">
                  {res.map((r) => (
                    <tr key={r.reference}><td className="py-2 pr-2 tabular-nums">{r.time}</td><td className="py-2 pr-2">{r.customer.name}<span className="block text-xs text-muted">{r.reference} · {r.seatingAreaLabel} {r.tableCode ? `· ${r.tableCode}` : ""}</span></td><td className="py-2 pr-2">{r.partySize}</td><td className="py-2 text-right"><StatusPill status={r.status} /></td></tr>
                  ))}
                </tbody></table>
              )}
            </Card>
            <Card>
              <div className="mb-3 flex items-center justify-between"><h2 className="text-2xl">Orders</h2><Link href="/admin/orders" className="text-sm underline">Manage</Link></div>
              {orders.length === 0 ? <p className="text-sm text-muted">No orders.</p> : (
                <table className="w-full text-sm"><tbody className="divide-y divide-sand-200">
                  {orders.map((o) => (
                    <tr key={o.number}><td className="py-2 pr-2 tabular-nums">{o.fulfilment.time}</td><td className="py-2 pr-2">{o.customer.name}<span className="block text-xs text-muted">{o.number} · {o.type.replace(/_/g, " ")} · {o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}</span></td><td className="py-2 pr-2 tabular-nums">{o.totals.total.formatted}</td><td className="py-2 text-right"><StatusPill status={o.status} /></td></tr>
                  ))}
                </tbody></table>
              )}
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
