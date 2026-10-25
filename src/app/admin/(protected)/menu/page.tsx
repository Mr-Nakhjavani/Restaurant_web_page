"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiClientError } from "@/lib/api-client";
import { AdminHeader, Card } from "@/components/admin/ui";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/fields";
import { Spinner } from "@/components/ui/spinner";

interface Item {
  id: string; name: string; category: string; kind: string; price: { amountFils: number; formatted: string };
  availabilityStatus: "available" | "sold_out" | "paused"; soldOutUntil: string | null; isVisible: boolean; featured: boolean; dailyLimit: number | null; orderedToday: number;
}

export default function AdminMenu() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [filter, setFilter] = useState("");
  const load = useCallback(async () => setItems((await api<{ data: Item[] }>("/admin/menu/items")).data), []);
  useEffect(() => {
    load();
    api<{ data: { isAdmin: boolean } }>("/admin/auth/me").then((r) => setIsAdmin(r.data.isAdmin));
  }, [load]);
  const patch = async (id: string, body: Record<string, unknown>, label: string) => {
    setMsg(null);
    try {
      await api(`/admin/menu/items/${id}`, { method: "PATCH", json: body });
      setMsg({ tone: "success", text: label });
      await load();
    } catch (e) {
      setMsg({ tone: "error", text: (e as ApiClientError).message });
    }
  };
  const shown = (items ?? []).filter((i) => !filter || `${i.name} ${i.category}`.toLowerCase().includes(filter.toLowerCase()));
  return (
    <>
      <AdminHeader title="Menu & availability" subtitle="Changes apply immediately to the website, the API, the voice agent and the knowledge base." actions={<Input placeholder="Filter dishes" aria-label="Filter dishes" value={filter} onChange={(e) => setFilter(e.target.value)} className="!w-60" />} />
      {msg && <Alert tone={msg.tone} className="mb-4">{msg.text}</Alert>}
      {!items ? <Spinner /> : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-sand-50 text-left text-xs tracking-wide text-muted uppercase"><tr><th className="p-3">Dish</th><th className="p-3">Price (AED)</th><th className="p-3">Availability</th><th className="p-3">Today</th><th className="p-3">Visible</th><th className="p-3">Featured</th></tr></thead>
            <tbody className="divide-y divide-sand-200">
              {shown.map((i) => (
                <Row key={i.id} item={i} isAdmin={isAdmin} onPatch={patch} />
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}

function Row({ item, isAdmin, onPatch }: { item: Item; isAdmin: boolean; onPatch: (id: string, body: Record<string, unknown>, label: string) => void }) {
  const [price, setPrice] = useState((item.price.amountFils / 100).toFixed(2));
  return (
    <tr className="align-middle">
      <td className="p-3">{item.name}<span className="block text-xs text-muted">{item.category} · {item.kind.replace(/_/g, " ")}</span></td>
      <td className="p-3">
        {isAdmin ? (
          <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); onPatch(item.id, { priceFils: Math.round(Number(price) * 100) }, `${item.name}: price updated to AED ${price}`); }}>
            <Input aria-label={`Price of ${item.name}`} value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" className="!w-24 !py-1.5" />
            {Math.round(Number(price) * 100) !== item.price.amountFils && <Button size="sm" type="submit">Save</Button>}
          </form>
        ) : item.price.formatted}
      </td>
      <td className="p-3">
        <Select aria-label={`Availability of ${item.name}`} value={item.availabilityStatus} className="!w-44 !py-1.5" onChange={(e) => onPatch(item.id, { availabilityStatus: e.target.value }, `${item.name}: ${e.target.value === "sold_out" ? "sold out until end of today" : e.target.value}`)}>
          <option value="available">Available</option>
          <option value="sold_out">Sold out today</option>
          <option value="paused">Paused (until re-enabled)</option>
        </Select>
      </td>
      <td className="p-3 text-xs text-muted">{item.orderedToday} ordered{item.dailyLimit !== null ? ` / ${item.dailyLimit} limit` : ""}</td>
      <td className="p-3"><input type="checkbox" aria-label={`${item.name} visible`} disabled={!isAdmin} checked={item.isVisible} onChange={(e) => onPatch(item.id, { isVisible: e.target.checked }, `${item.name}: ${e.target.checked ? "shown" : "hidden"}`)} className="h-4 w-4 accent-[#43291c]" /></td>
      <td className="p-3"><input type="checkbox" aria-label={`${item.name} featured`} disabled={!isAdmin} checked={item.featured} onChange={(e) => onPatch(item.id, { featured: e.target.checked }, `${item.name}: featured ${e.target.checked ? "on" : "off"}`)} className="h-4 w-4 accent-[#43291c]" /></td>
    </tr>
  );
}
