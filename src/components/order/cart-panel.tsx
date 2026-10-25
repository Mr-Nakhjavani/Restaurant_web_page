"use client";

import Image from "next/image";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { formatAed } from "@/lib/format";
import { buttonClass } from "@/components/ui/button";
import { QuantityStepper } from "@/components/ui/fields";
import { useCart } from "@/components/site/cart-context";

export function CartPanel({ compact = false }: { compact?: boolean }) {
  const { lines, update, remove, estimatedSubtotalFils, count, ready } = useCart();
  if (!ready) return null;
  if (lines.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-sand-300 p-6 text-center">
        <p className="font-display text-2xl text-date-800">Your order is empty</p>
        <p className="mt-2 text-sm text-muted">Add dishes from the menu. Prices and availability are confirmed at checkout.</p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl bg-white ring-1 ring-sand-200">
      <ul className="divide-y divide-sand-200">
        {lines.map((l) => (
          <li key={l.lineId} className="flex gap-3 p-4">
            {!compact && (
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-sand-200">
                <Image src={l.image} alt="" fill sizes="56px" className="photo-grade object-cover" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium leading-snug text-date-900">{l.name}</p>
                <p className="shrink-0 text-sm tabular-nums">{formatAed(l.unitPriceFils * l.quantity)}</p>
              </div>
              {l.optionLabels.length > 0 && <p className="mt-0.5 text-xs text-muted">{l.optionLabels.join(" · ")}</p>}
              {l.notes && <p className="mt-0.5 text-xs italic text-muted">“{l.notes}”</p>}
              <div className="mt-2 flex items-center justify-between">
                <QuantityStepper value={l.quantity} onChange={(n) => update(l.lineId, { quantity: n })} label={`quantity of ${l.name}`} />
                <button type="button" onClick={() => remove(l.lineId)} className="rounded-full p-2 text-muted hover:bg-sand-100 hover:text-danger-700" aria-label={`Remove ${l.name}`}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <div className="border-t border-sand-200 p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted">Estimated subtotal · {count} item{count === 1 ? "" : "s"}</span>
          <span className="font-display text-2xl font-semibold text-date-800">{formatAed(estimatedSubtotalFils)}</span>
        </div>
        <p className="mt-1 text-xs text-muted">Final prices, delivery fees and timing are confirmed by the restaurant at checkout.</p>
        <Link href="/order/checkout" className={buttonClass("primary", "md", "mt-4 w-full")}>Continue to checkout</Link>
      </div>
    </div>
  );
}
