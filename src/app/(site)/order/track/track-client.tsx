"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { OrderView } from "@/components/order/order-view";
import { recentOrders, type RememberedOrder } from "@/components/order/recent-orders";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/fields";

export function TrackClient() {
  const [number, setNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [query, setQuery] = useState<{ number: string; phone: string } | null>(null);
  const [recent, setRecent] = useState<RememberedOrder[]>([]);
  useEffect(() => {
    setRecent(recentOrders());
    const n = new URLSearchParams(window.location.search).get("number");
    if (n) setNumber(n);
  }, []);
  return (
    <div className="mt-10 space-y-10">
      <form
        className="grid max-w-2xl gap-4 rounded-2xl bg-white p-6 ring-1 ring-sand-200 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          if (number.trim() && phone.trim()) setQuery({ number: number.trim().toUpperCase(), phone: phone.trim() });
        }}
      >
        <Field label="Order number" htmlFor="tn"><Input id="tn" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="ORD-123456" required /></Field>
        <Field label="Phone number" htmlFor="tp"><Input id="tp" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="050 123 4567" required /></Field>
        <Button type="submit">Find order</Button>
      </form>
      {query && <OrderView key={`${query.number}-${query.phone}`} number={query.number} auth={{ phone: query.phone }} />}
      {!query && recent.length > 0 && (
        <div>
          <p className="eyebrow mb-3">Orders placed on this device</p>
          <ul className="flex flex-wrap gap-3">
            {recent.map((o) => (
              <li key={o.number}>
                <Link href={`/order/confirmation/${o.number}#t=${encodeURIComponent(o.token)}`} className="inline-block rounded-full bg-white px-4 py-2 text-sm ring-1 ring-sand-300 hover:bg-sand-100">{o.number}</Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
