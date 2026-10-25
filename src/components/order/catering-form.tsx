"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { api, ApiClientError, newIdempotencyKey } from "@/lib/api-client";
import { addDaysIso, formatAed, formatDateLong, todayInDubai } from "@/lib/format";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, RadioCard, Select, Textarea } from "@/components/ui/fields";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { rememberOrder } from "./recent-orders";

interface CItem {
  id: string;
  name: string;
  arabicName: string;
  price: { amountFils: number; formatted: string };
  servesPeople: number;
  minQuantity: number;
  maxPerDay: number | null;
  minNoticeHours: number | null;
  bulkOnly: boolean;
  note: string | null;
  options: { id: string; name: string; priceDeltaFils: number }[];
  category: string;
}
interface Quote {
  quoteId: string;
  status: "feasible" | "needs_changes" | "not_possible";
  feasible: boolean;
  issues: { code: string; message: string; blocking: boolean }[];
  lines: { name: string; quantity: number; lineTotal: { formatted: string }; options: { name: string }[] }[];
  portions: number;
  totals: { subtotal: { formatted: string }; discount: { formatted: string; amountFils: number }; discountPercent: number; deliveryFee: { formatted: string; amountFils: number }; total: { formatted: string }; vatIncluded: { formatted: string }; depositRequired: { formatted: string; amountFils: number } };
  leadTime: { requiredHours: number; availableHours: number };
  capacity: { remaining: number; dailyCapacityPortions: number };
  alternatives: { date: string; time: string }[];
  validUntil: string;
  nextSteps: string[];
  escalation: { reason: string; contact: string } | null;
}

export function CateringForm({ items }: { items: CItem[] }) {
  const router = useRouter();
  const [qty, setQty] = useState<Record<string, number>>({});
  const [opt, setOpt] = useState<Record<string, string>>({});
  const [date, setDate] = useState(addDaysIso(todayInDubai(), 3));
  const [time, setTime] = useState("12:30");
  const [type, setType] = useState<"pickup" | "delivery">("pickup");
  const [area, setArea] = useState("");
  const [guests, setGuests] = useState(40);
  const [eventType, setEventType] = useState("office_lunch");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiClientError | null>(null);
  const [customer, setCustomer] = useState({ name: "", phone: "", email: "", company: "", building: "", street: "", unit: "", notes: "" });
  const idem = useRef(newIdempotencyKey("web-cat"));

  const lines = useMemo(
    () => items.filter((i) => (qty[i.id] ?? 0) > 0).map((i) => ({ itemId: i.id, quantity: qty[i.id], ...(opt[i.id] ? { options: [opt[i.id]] } : {}) })),
    [items, qty, opt],
  );
  const estimate = items.reduce((s, i) => s + (qty[i.id] ?? 0) * (i.price.amountFils + (i.options.find((o) => o.id === opt[i.id])?.priceDeltaFils ?? 0)), 0);
  const servings = items.reduce((s, i) => s + (qty[i.id] ?? 0) * i.servesPeople, 0);
  const times = Array.from({ length: 23 }, (_, k) => 10 * 60 + k * 30).map((m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);

  const getQuote = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ data: Quote }>("/bulk-orders/quotes", {
        method: "POST",
        json: { items: lines, fulfilment: { type, date, time }, ...(type === "delivery" ? { deliveryArea: area } : {}), guestCount: guests, eventType },
      });
      setQuote(r.data);
      idem.current = newIdempotencyKey("web-cat");
    } catch (e) {
      setError(e as ApiClientError);
    } finally {
      setBusy(false);
    }
  };

  const placeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quote) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ data: { order: { number: string }; accessToken: string } }>("/bulk-orders", {
        method: "POST",
        headers: { "Idempotency-Key": idem.current },
        json: {
          quoteId: quote.quoteId,
          customer: { name: customer.name.trim(), phone: customer.phone.trim(), ...(customer.email.trim() ? { email: customer.email.trim() } : {}) },
          ...(customer.company.trim() ? { companyName: customer.company.trim() } : {}),
          ...(type === "delivery" ? { deliveryAddress: { emirate: "Dubai", area, building: customer.building, street: customer.street, ...(customer.unit ? { unit: customer.unit } : {}) } } : {}),
          ...(customer.notes.trim() ? { notes: customer.notes.trim() } : {}),
        },
      });
      rememberOrder(r.data.order.number, r.data.accessToken);
      router.push(`/order/confirmation/${r.data.order.number}#t=${encodeURIComponent(r.data.accessToken)}`);
    } catch (err) {
      setError(err as ApiClientError);
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr]">
      <div className="min-w-0 space-y-8">
        <section className="rounded-3xl bg-white p-6 ring-1 ring-sand-200 md:p-8">
          <h2 className="text-3xl">1. Choose dishes</h2>
          <ul className="mt-6 divide-y divide-sand-200">
            {items.map((i) => (
              <li key={i.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-date-900">{i.name} <span lang="ar" className="font-arabic text-brass-700">{i.arabicName}</span></p>
                  <p className="text-xs text-muted">
                    {i.price.formatted} · serves {i.servesPeople}
                    {i.minQuantity > 1 ? ` · min ${i.minQuantity}` : ""}
                    {i.maxPerDay ? ` · max ${i.maxPerDay}/day` : ""}
                    {i.minNoticeHours ? ` · ${i.minNoticeHours} h notice` : ""}
                  </p>
                  {i.bulkOnly && <Badge tone="brass" className="mt-1">Catering only</Badge>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {i.options.length > 0 && (
                    <select aria-label={`${i.name} option`} className="field-input !w-auto !py-1.5 text-sm" value={opt[i.id] ?? i.options[0].id} onChange={(e) => setOpt({ ...opt, [i.id]: e.target.value })}>
                      {i.options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                  )}
                  <input
                    type="number"
                    min={0}
                    max={500}
                    inputMode="numeric"
                    aria-label={`Quantity of ${i.name}`}
                    className="field-input !w-24 !py-1.5 text-right"
                    value={qty[i.id] ?? 0}
                    onChange={(e) => setQty({ ...qty, [i.id]: Math.max(0, Math.min(500, Number(e.target.value) || 0)) })}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-3xl bg-white p-6 ring-1 ring-sand-200 md:p-8">
          <h2 className="text-3xl">2. When and where</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <RadioCard name="ctype" value="pickup" checked={type === "pickup"} onChange={() => setType("pickup")} title="Collect from Al Seef" description="Gate 3 counter" />
            <RadioCard name="ctype" value="delivery" checked={type === "delivery"} onChange={() => setType("delivery")} title="Catering delivery" description="Anywhere in Dubai · fee by zone" />
            <Field label="Date" htmlFor="c-date"><Input id="c-date" type="date" min={todayInDubai()} max={addDaysIso(todayInDubai(), 90)} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
            <Field label="Time" htmlFor="c-time">
              <Select id="c-time" value={time} onChange={(e) => setTime(e.target.value)}>{times.map((t) => <option key={t} value={t}>{t}</option>)}</Select>
            </Field>
            {type === "delivery" && <Field label="Delivery area" htmlFor="c-area" hint="e.g. Business Bay, Dubai Marina, Al Barsha"><Input id="c-area" value={area} onChange={(e) => setArea(e.target.value)} /></Field>}
            <Field label="Guests" htmlFor="c-guests"><Input id="c-guests" type="number" min={1} max={2000} value={guests} onChange={(e) => setGuests(Number(e.target.value) || 1)} /></Field>
            <Field label="Occasion" htmlFor="c-event">
              <Select id="c-event" value={eventType} onChange={(e) => setEventType(e.target.value)}>
                <option value="office_lunch">Office lunch</option>
                <option value="family_gathering">Family gathering</option>
                <option value="wedding">Wedding</option>
                <option value="religious_occasion">Religious occasion</option>
                <option value="corporate_event">Corporate event</option>
                <option value="other">Other</option>
              </Select>
            </Field>
          </div>
        </section>
      </div>

      <aside className="min-w-0 space-y-6 lg:sticky lg:top-[110px] lg:self-start">
        <div className="rounded-3xl bg-date-900 p-6 text-sand-100 md:p-8">
          <p className="eyebrow eyebrow-light">Your request</p>
          <p className="mt-3 font-display text-4xl text-sand-50">{formatAed(estimate)}</p>
          <p className="mt-1 text-sm text-sand-200">Estimate before discounts and delivery · {servings} servings for {guests} guests · {formatDateLong(date)} at {time}</p>
          <Button variant="light" className="mt-6 w-full" onClick={getQuote} disabled={busy || lines.length === 0 || (type === "delivery" && !area)}>
            {busy && !quote ? <Spinner /> : "Check feasibility & get a quote"}
          </Button>
        </div>
        {error && <Alert tone="error">{error.message}</Alert>}
        {quote && (
          <div className="space-y-4 rounded-3xl bg-white p-6 ring-1 ring-sand-200">
            <div className="flex items-center justify-between">
              <p className="eyebrow">Quote {quote.quoteId}</p>
              <Badge tone={quote.status === "feasible" ? "green" : quote.status === "needs_changes" ? "amber" : "red"}>{quote.status.replace("_", " ")}</Badge>
            </div>
            <ul className="space-y-1 text-sm">
              {quote.lines.map((l, k) => (
                <li key={k} className="flex justify-between gap-2"><span>{l.quantity} × {l.name}{l.options.length ? ` (${l.options.map((o) => o.name).join(", ")})` : ""}</span><span className="tabular-nums">{l.lineTotal.formatted}</span></li>
              ))}
            </ul>
            <dl className="space-y-1 border-t border-sand-200 pt-3 text-sm">
              {quote.totals.discount.amountFils > 0 && <div className="flex justify-between"><dt>Volume discount ({quote.totals.discountPercent}%)</dt><dd>−{quote.totals.discount.formatted}</dd></div>}
              {quote.totals.deliveryFee.amountFils > 0 && <div className="flex justify-between"><dt>Delivery</dt><dd>{quote.totals.deliveryFee.formatted}</dd></div>}
              <div className="flex justify-between font-display text-2xl font-semibold text-date-800"><dt>Total</dt><dd>{quote.totals.total.formatted}</dd></div>
              {quote.totals.depositRequired.amountFils > 0 && <div className="flex justify-between text-xs text-muted"><dt>Deposit after confirmation</dt><dd>{quote.totals.depositRequired.formatted}</dd></div>}
            </dl>
            {quote.issues.map((i, k) => <Alert key={k} tone={i.blocking ? "error" : "warning"}>{i.message}</Alert>)}
            {quote.alternatives.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium">Feasible alternatives</p>
                <div className="flex flex-wrap gap-2">
                  {quote.alternatives.map((a) => (
                    <button key={a.date + a.time} type="button" onClick={() => { setDate(a.date); setTime(a.time); setQuote(null); }} className="rounded-full bg-sand-100 px-3 py-1 text-xs ring-1 ring-sand-300 hover:bg-sand-200">
                      {a.date} · {a.time}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {quote.escalation && <Alert tone="info" title="Talk to our events team">{quote.escalation.contact}</Alert>}
            {quote.feasible && (
              <form onSubmit={placeOrder} className="space-y-3 border-t border-sand-200 pt-4">
                <p className="text-sm font-medium text-date-800">3. Your details</p>
                <Input aria-label="Name" placeholder="Full name" required minLength={2} value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
                <Input aria-label="Phone" placeholder="Mobile number" required type="tel" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
                <Input aria-label="E-mail" placeholder="E-mail (optional)" type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} />
                <Input aria-label="Company" placeholder="Company (optional)" value={customer.company} onChange={(e) => setCustomer({ ...customer, company: e.target.value })} />
                {type === "delivery" && (
                  <>
                    <Input aria-label="Building" placeholder="Building / villa" required value={customer.building} onChange={(e) => setCustomer({ ...customer, building: e.target.value })} />
                    <Input aria-label="Street" placeholder="Street" required value={customer.street} onChange={(e) => setCustomer({ ...customer, street: e.target.value })} />
                    <Input aria-label="Unit" placeholder="Office / unit (optional)" value={customer.unit} onChange={(e) => setCustomer({ ...customer, unit: e.target.value })} />
                  </>
                )}
                <Textarea aria-label="Notes" placeholder="Notes for the catering team (allergies, labelling, setup)" maxLength={500} value={customer.notes} onChange={(e) => setCustomer({ ...customer, notes: e.target.value })} />
                <Button type="submit" className="w-full" disabled={busy}>{busy ? <Spinner /> : "Send catering request"}</Button>
                <p className="text-xs text-muted">Your order stays <strong>pending</strong> until the catering team confirms it by phone. No payment is taken online.</p>
              </form>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
