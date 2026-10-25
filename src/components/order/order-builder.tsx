"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Plus, ShoppingBag } from "lucide-react";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { addDaysIso, formatAed, formatDateShort, todayInDubai } from "@/lib/format";
import { buttonClass } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { DietBadges, SpiceLevel } from "@/components/menu/item-bits";
import { useCart, type OrderTypeChoice } from "@/components/site/cart-context";
import { CartPanel } from "./cart-panel";
import { CustomizeDialog } from "./customize-dialog";

interface Item {
  id: string;
  slug: string;
  name: string;
  arabicName: string;
  shortDescription: string;
  price: { formatted: string; amountFils: number };
  image: { url: string; alt: string };
  spiceLevel: number;
  dietaryTags: string[];
  kind: string;
  category: { id: string; slug: string; name: string };
  availability: { orderable: boolean; status: string; reasons: { code: string; message: string }[]; nextAvailable: { date: string; time: string } | null };
  portion: { servesPeople: number };
}
interface Category { id: string; slug: string; name: string; arabicName: string }

const TYPES: { id: OrderTypeChoice; label: string; hint: string }[] = [
  { id: "pickup", label: "Pickup", hint: "Collect at Gate 3" },
  { id: "delivery", label: "Delivery", hint: "Central Dubai, 12:00–22:30" },
  { id: "dine_in_preorder", label: "Dine-in pre-order", hint: "With a table booking" },
];

function timeOptions() {
  const out: string[] = [];
  for (let m = 8 * 60 + 30; m <= 23 * 60 + 45; m += 15) out.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  return out;
}

export function OrderBuilder({ initialItems, categories, addSlug }: { initialItems: Item[]; categories: Category[]; addSlug: string | null }) {
  const { fulfilment, setFulfilment, count, estimatedSubtotalFils, ready } = useCart();
  const [items, setItems] = useState<Item[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customizing, setCustomizing] = useState<string | null>(addSlug);
  const [showCart, setShowCart] = useState(false);
  const dates = useMemo(() => Array.from({ length: 8 }, (_, i) => addDaysIso(todayInDubai(), i)), []);

  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ mode: fulfilment.type });
    if (!fulfilment.asap && fulfilment.date) params.set("date", fulfilment.date);
    if (!fulfilment.asap && fulfilment.date && fulfilment.time) params.set("time", fulfilment.time);
    setLoading(true);
    api<{ data: Item[] }>(`/menu?${params}`, { signal: controller.signal })
      .then((r) => {
        setItems(r.data.filter((i) => i.kind !== "catering"));
        setError(null);
      })
      .catch((e) => !controller.signal.aborted && setError((e as Error).message))
      .finally(() => !controller.signal.aborted && setLoading(false));
    return () => controller.abort();
  }, [ready, fulfilment.type, fulfilment.asap, fulfilment.date, fulfilment.time]);

  const grouped = categories.map((c) => ({ c, list: items.filter((i) => i.category.id === c.id) })).filter((g) => g.list.length);

  return (
    <div className="container-page pb-32">
      <div className="sticky top-[84px] z-30 -mx-5 border-b border-sand-200 bg-sand-50/95 px-5 py-4 backdrop-blur md:-mx-10 md:px-10">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div role="radiogroup" aria-label="Order type" className="flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={fulfilment.type === t.id}
                onClick={() => setFulfilment({ type: t.id })}
                className={cn("rounded-full px-4 py-2 text-left text-sm transition ring-1", fulfilment.type === t.id ? "bg-date-800 text-sand-50 ring-date-800" : "bg-white text-date-800 ring-sand-300 hover:bg-sand-100")}
              >
                <span className="font-medium">{t.label}</span>
                <span className={cn("ml-2 hidden text-xs sm:inline", fulfilment.type === t.id ? "text-sand-200" : "text-muted")}>{t.hint}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="when-date">Date</label>
            <select
              id="when-date"
              className="field-input !w-auto !rounded-full !py-2 text-sm"
              value={fulfilment.asap ? "asap" : (fulfilment.date ?? "asap")}
              onChange={(e) => (e.target.value === "asap" ? setFulfilment({ asap: true, date: null, time: null }) : setFulfilment({ asap: false, date: e.target.value, time: fulfilment.time ?? "13:00" }))}
            >
              <option value="asap">As soon as possible</option>
              {dates.map((d, i) => (
                <option key={d} value={d}>{i === 0 ? "Today" : i === 1 ? "Tomorrow" : formatDateShort(d)}</option>
              ))}
            </select>
            {!fulfilment.asap && (
              <>
                <label className="sr-only" htmlFor="when-time">Time</label>
                <select id="when-time" className="field-input !w-auto !rounded-full !py-2 text-sm" value={fulfilment.time ?? "13:00"} onChange={(e) => setFulfilment({ time: e.target.value })}>
                  {timeOptions().map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </>
            )}
            {loading && <Spinner label="Checking availability" className="text-muted" />}
          </div>
        </div>
        <div className="scrollbar-none mt-3 flex gap-1 overflow-x-auto">
          {grouped.map(({ c }) => (
            <a key={c.id} href={`#order-${c.slug}`} className="shrink-0 rounded-full px-3 py-1.5 text-xs text-date-800 hover:bg-sand-200">{c.name}</a>
          ))}
        </div>
      </div>

      {error && <Alert tone="error" className="mt-6" title="Availability could not be refreshed">{error}</Alert>}

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
        <div>
          {grouped.map(({ c, list }) => (
            <section key={c.id} id={`order-${c.slug}`} className="scroll-mt-52 pb-10">
              <h2 className="text-3xl md:text-4xl">{c.name} <span lang="ar" className="font-arabic text-xl text-brass-700">{c.arabicName}</span></h2>
              <ul className="mt-5 grid gap-4 xl:grid-cols-2">
                {list.map((item) => {
                  const ok = item.availability.orderable;
                  return (
                    <li key={item.id} className={cn("flex gap-4 rounded-2xl bg-white p-3 ring-1 ring-sand-200 transition", ok ? "hover:shadow-[var(--shadow-soft)]" : "opacity-80")}>
                      <Link href={`/menu/${item.slug}`} className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-sand-200 sm:h-32 sm:w-32" aria-label={`${item.name} details`}>
                        <Image src={item.image.url} alt="" fill sizes="128px" className={cn("photo-grade object-cover", !ok && "grayscale-[40%]")} />
                      </Link>
                      <div className="flex min-w-0 flex-1 flex-col py-1 pr-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-display text-xl leading-tight text-date-900">{item.name}</h3>
                          <span className="shrink-0 font-medium tabular-nums text-date-800">{item.price.formatted}</span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-muted">{item.shortDescription}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <DietBadges tags={item.dietaryTags} compact />
                          <SpiceLevel level={item.spiceLevel} />
                        </div>
                        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
                          <p className={cn("text-xs", ok ? "text-success-700" : item.availability.status === "sold_out" ? "text-danger-700" : "text-warning-700")}>
                            {ok ? "Available" : item.availability.reasons[0]?.message}
                          </p>
                          <button
                            type="button"
                            disabled={!ok}
                            onClick={() => setCustomizing(item.slug)}
                            className={buttonClass("outline", "sm", "shrink-0 !px-3")}
                            aria-label={ok ? `Add ${item.name}` : `${item.name} is not available for this time`}
                          >
                            <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          <p className="text-sm text-muted">
            Ordering for 20+ people, an office or an event? <Link href="/catering" className="text-date-800 underline">Request a catering quote</Link>.
          </p>
        </div>
        <aside className="hidden lg:block" aria-label="Your order">
          <div className="sticky top-[230px]">
            <p className="eyebrow mb-3">Your order</p>
            <CartPanel />
          </div>
        </aside>
      </div>

      {ready && count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-sand-200 bg-sand-50/95 p-3 backdrop-blur lg:hidden">
          <button type="button" onClick={() => setShowCart((v) => !v)} className={buttonClass("primary", "md", "w-full justify-between")} aria-expanded={showCart}>
            <span className="inline-flex items-center gap-2"><ShoppingBag className="h-4 w-4" aria-hidden="true" /> {count} item{count === 1 ? "" : "s"}</span>
            <span>{formatAed(estimatedSubtotalFils)} · view</span>
          </button>
          {showCart && <div className="mt-3 max-h-[60vh] overflow-y-auto"><CartPanel compact /></div>}
        </div>
      )}

      <CustomizeDialog slug={customizing} onClose={() => setCustomizing(null)} />
    </div>
  );
}
