"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiClientError, newIdempotencyKey } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { addDaysIso, formatDateShort, formatIsoDateTime, todayInDubai } from "@/lib/format";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClass } from "@/components/ui/button";
import { Field, Input, RadioCard, Select, Textarea } from "@/components/ui/fields";
import { Spinner } from "@/components/ui/spinner";
import { useCart, type OrderTypeChoice } from "@/components/site/cart-context";
import { CartPanel } from "./cart-panel";
import { rememberOrder } from "./recent-orders";

interface Money { amountFils: number; formatted: string }
interface Slot { time: string; at: string; available: boolean; remainingPortions: number }
interface Issue { code: string; message: string; lineIndex: number | null; itemId: string | null; details: Record<string, unknown> | null }
interface Quote {
  valid: boolean;
  issues: Issue[];
  lines: { lineIndex: number; name: string; quantity: number; options: { name: string }[]; unitPrice: Money; lineTotal: Money; allergens: string[] }[];
  totals: { subtotal: Money; deliveryFee: Money; total: Money; vatIncluded: Money };
  fulfilment: { accepted: { date: string; time: string; at: string } | null; leadTimeMinutes: number; alternatives: Slot[]; availableSlots: Slot[] };
  delivery: { zone: { name: string } | null; fee: Money; minimumOrder: Money | null } | null;
  paymentMethods: { id: string; label: string }[];
  requiresManualReview: boolean;
  notices: string[];
}

const AREAS_HINT = "e.g. Al Karama, Bur Dubai, Deira, Downtown Dubai, Business Bay";

export function Checkout() {
  const router = useRouter();
  const { lines, fulfilment, setFulfilment, clear, ready } = useCart();
  const [date, setDate] = useState<string>(fulfilment.date ?? todayInDubai());
  const [asap, setAsap] = useState<boolean>(fulfilment.asap);
  const [time, setTime] = useState<string | null>(fulfilment.time);
  const [address, setAddress] = useState({ area: "", building: "", street: "", unit: "", landmark: "", instructions: "" });
  const [reservationRef, setReservationRef] = useState(fulfilment.reservationReference ?? "");
  const [customer, setCustomer] = useState({ name: "", phone: "", email: "" });
  const [forSomeoneElse, setForSomeoneElse] = useState(false);
  const [recipient, setRecipient] = useState({ name: "", phone: "" });
  const [instructions, setInstructions] = useState("");
  const [payment, setPayment] = useState<string>("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<ApiClientError | null>(null);
  const [touched, setTouched] = useState(false);
  const idemKey = useRef<string>(newIdempotencyKey("web-order"));
  const type = fulfilment.type;
  const dates = useMemo(() => Array.from({ length: 8 }, (_, i) => addDaysIso(todayInDubai(), i)), []);

  const body = useMemo(() => {
    const items = lines.map((l) => ({ itemId: l.itemId, quantity: l.quantity, options: l.options, ...(l.notes ? { notes: l.notes } : {}) }));
    const f = { type, ...(asap || !time ? { asap: true } : { date, time }), ...(type === "dine_in_preorder" && reservationRef ? { reservationReference: reservationRef } : {}) };
    const deliveryAddress =
      type === "delivery" && address.area
        ? {
            emirate: "Dubai" as const,
            area: address.area,
            building: address.building || "-",
            street: address.street || "-",
            ...(address.unit ? { unit: address.unit } : {}),
            ...(address.landmark ? { landmark: address.landmark } : {}),
            ...(address.instructions ? { instructions: address.instructions } : {}),
          }
        : undefined;
    return { items, fulfilment: f, deliveryAddress };
  }, [lines, type, asap, date, time, reservationRef, address]);

  const runQuote = useCallback(async () => {
    if (!lines.length) return;
    setQuoting(true);
    try {
      const r = await api<{ data: Quote }>("/orders/quote", { method: "POST", json: { ...body, ...(customer.phone.length > 8 ? { customerPhone: customer.phone } : {}) } });
      setQuote(r.data);
      setPayment((cur) => (cur && r.data.paymentMethods.some((p) => p.id === cur) ? cur : (r.data.paymentMethods[0]?.id ?? "")));
    } catch (e) {
      setSubmitError(e as ApiClientError);
    } finally {
      setQuoting(false);
    }
  }, [body, lines.length, customer.phone]);

  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(runQuote, 350);
    return () => clearTimeout(t);
  }, [ready, runQuote]);

  useEffect(() => {
    idemKey.current = newIdempotencyKey("web-order");
  }, [body, customer, recipient, instructions, payment]);

  useEffect(() => setFulfilment({ asap, date: asap ? null : date, time: asap ? null : time, reservationReference: reservationRef || undefined }), [asap, date, time, reservationRef, setFulfilment]);

  const missing: string[] = [];
  if (!customer.name.trim() || customer.name.trim().length < 2) missing.push("your name");
  if (customer.phone.replace(/\D/g, "").length < 9) missing.push("a phone number");
  if (type === "delivery" && (!address.area || !address.building || !address.street)) missing.push("the delivery address");
  if (type === "dine_in_preorder" && !reservationRef) missing.push("your reservation reference");
  if (!asap && !time) missing.push("a time");
  const canSubmit = !!quote?.valid && missing.length === 0 && !submitting;

  const submit = async () => {
    setTouched(true);
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = {
        ...body,
        customer: { name: customer.name.trim(), phone: customer.phone.trim(), ...(customer.email.trim() ? { email: customer.email.trim() } : {}) },
        ...(forSomeoneElse && recipient.name.trim() ? { recipient: { name: recipient.name.trim(), ...(recipient.phone.trim() ? { phone: recipient.phone.trim() } : {}) } } : {}),
        ...(instructions.trim() ? { specialInstructions: instructions.trim() } : {}),
        ...(payment ? { paymentMethod: payment } : {}),
      };
      const r = await api<{ data: { order: { number: string }; accessToken: string } }>("/orders", { method: "POST", json: payload, headers: { "Idempotency-Key": idemKey.current } });
      rememberOrder(r.data.order.number, r.data.accessToken);
      clear();
      router.push(`/order/confirmation/${r.data.order.number}#t=${encodeURIComponent(r.data.accessToken)}`);
    } catch (e) {
      setSubmitError(e as ApiClientError);
      setSubmitting(false);
      runQuote();
    }
  };

  if (!ready) return <div className="container-page py-24"><Spinner /></div>;
  if (!lines.length) {
    return (
      <div className="container-page py-24 text-center">
        <p className="font-display text-4xl">Your order is empty</p>
        <p className="mt-3 text-muted">Add a few dishes first.</p>
        <Link href="/order" className={buttonClass("primary", "md", "mt-8")}>Browse the menu</Link>
      </div>
    );
  }

  const slots = quote?.fulfilment.availableSlots ?? [];
  return (
    <div className="container-page grid gap-12 py-12 lg:grid-cols-[1fr_400px]">
      <div className="space-y-12">
        {/* 1. How & when */}
        <section aria-labelledby="how-h">
          <h2 id="how-h" className="text-3xl"><span className="text-brass-500">1.</span> How and when</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {(
              [
                ["pickup", "Pickup", "Collect at the counter, Gate 3, Al Seef. No address needed."],
                ["delivery", "Delivery", "Central Dubai, 12:00–22:30. Fee by area."],
                ["dine_in_preorder", "Dine-in pre-order", "Food ready when you sit down — needs a confirmed reservation."],
              ] as [OrderTypeChoice, string, string][]
            ).map(([id, title, desc]) => (
              <RadioCard key={id} name="type" value={id} checked={type === id} onChange={(v) => setFulfilment({ type: v as OrderTypeChoice })} title={title} description={desc} />
            ))}
          </div>

          {type === "delivery" && (
            <fieldset className="mt-6 grid gap-4 rounded-2xl bg-white p-5 ring-1 ring-sand-200 sm:grid-cols-2">
              <legend className="sr-only">Delivery address</legend>
              <Field label="Area (Dubai)" htmlFor="area" hint={AREAS_HINT} required error={touched && !address.area ? "Required for delivery" : null}>
                <Input id="area" value={address.area} onChange={(e) => setAddress({ ...address, area: e.target.value })} autoComplete="address-level3" />
              </Field>
              <Field label="Building or villa" htmlFor="building" required error={touched && !address.building ? "Required" : null}>
                <Input id="building" value={address.building} onChange={(e) => setAddress({ ...address, building: e.target.value })} />
              </Field>
              <Field label="Street" htmlFor="street" required error={touched && !address.street ? "Required" : null}>
                <Input id="street" value={address.street} onChange={(e) => setAddress({ ...address, street: e.target.value })} autoComplete="address-line1" />
              </Field>
              <Field label="Apartment / unit / floor" htmlFor="unit">
                <Input id="unit" value={address.unit} onChange={(e) => setAddress({ ...address, unit: e.target.value })} autoComplete="address-line2" />
              </Field>
              <Field label="Nearby landmark" htmlFor="landmark">
                <Input id="landmark" value={address.landmark} onChange={(e) => setAddress({ ...address, landmark: e.target.value })} />
              </Field>
              <Field label="Notes for the driver" htmlFor="dnotes">
                <Input id="dnotes" value={address.instructions} onChange={(e) => setAddress({ ...address, instructions: e.target.value })} maxLength={200} />
              </Field>
              {quote?.delivery?.zone && (
                <p className="text-sm text-success-700 sm:col-span-2">
                  {quote.delivery.zone.name}: delivery fee {quote.delivery.fee.formatted}{quote.delivery.minimumOrder ? `, minimum order ${quote.delivery.minimumOrder.formatted}` : ""}.
                </p>
              )}
            </fieldset>
          )}

          {type === "dine_in_preorder" && (
            <div className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-sand-200">
              <Field label="Reservation reference" htmlFor="resref" hint="Use the phone number you booked with below. No booking yet?" required error={touched && !reservationRef ? "Required" : null}>
                <Input id="resref" value={reservationRef} onChange={(e) => setReservationRef(e.target.value.toUpperCase())} placeholder="RES-123456" />
              </Field>
              <Link href="/reservations" className="mt-2 inline-block text-sm text-date-800 underline">Book a table first</Link>
            </div>
          )}

          <div className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-sand-200">
            <div className="flex flex-wrap items-end gap-4">
              <Field label="Day" htmlFor="date">
                <Select id="date" value={asap ? "asap" : date} onChange={(e) => (e.target.value === "asap" ? setAsap(true) : (setAsap(false), setDate(e.target.value), setTime(null)))} className="!w-auto">
                  <option value="asap">As soon as possible</option>
                  {dates.map((d, i) => (
                    <option key={d} value={d}>{i === 0 ? `Today, ${formatDateShort(d)}` : i === 1 ? `Tomorrow, ${formatDateShort(d)}` : formatDateShort(d)}</option>
                  ))}
                </Select>
              </Field>
              {quoting && <Spinner label="Checking times" className="mb-3 text-muted" />}
            </div>
            {asap ? (
              <p className="mt-4 text-sm text-muted">
                {quote?.fulfilment.accepted
                  ? <>Earliest time: <strong className="text-date-800">{formatIsoDateTime(quote.fulfilment.accepted.at)}</strong> (the kitchen needs about {quote.fulfilment.leadTimeMinutes} minutes).</>
                  : "We will find the earliest time the kitchen can have everything ready."}
              </p>
            ) : (
              <div className="mt-4">
                <p className="mb-2 text-sm font-medium text-date-800">{type === "delivery" ? "Delivery time" : type === "pickup" ? "Pickup time" : "Serve at"}</p>
                {slots.length === 0 && !quoting && <p className="text-sm text-muted">No times available on this day for this order. Try another day.</p>}
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8" role="radiogroup" aria-label="Available times">
                  {slots.map((s) => (
                    <button
                      key={s.at}
                      type="button"
                      role="radio"
                      aria-checked={time === s.time}
                      disabled={!s.available}
                      onClick={() => setTime(s.time)}
                      className={cn("rounded-lg px-2 py-2 text-sm tabular-nums ring-1 transition", time === s.time ? "bg-date-800 text-sand-50 ring-date-800" : s.available ? "bg-sand-50 text-date-800 ring-sand-300 hover:bg-sand-100" : "cursor-not-allowed text-sand-400 line-through ring-sand-200")}
                      title={s.available ? undefined : "Fully booked"}
                    >
                      {s.time}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 2. Details */}
        <section aria-labelledby="details-h">
          <h2 id="details-h" className="text-3xl"><span className="text-brass-500">2.</span> Your details</h2>
          <div className="mt-5 grid gap-4 rounded-2xl bg-white p-5 ring-1 ring-sand-200 sm:grid-cols-2">
            <Field label="Full name" htmlFor="name" required error={touched && customer.name.trim().length < 2 ? "Please enter your name" : null}>
              <Input id="name" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} autoComplete="name" />
            </Field>
            <Field label="Mobile number" htmlFor="phone" required hint={type === "delivery" ? "A UAE mobile, e.g. 050 123 4567" : "UAE (050 123 4567) or international with country code"} error={touched && customer.phone.replace(/\D/g, "").length < 9 ? "Please enter a valid phone number" : null}>
              <Input id="phone" type="tel" inputMode="tel" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} autoComplete="tel" />
            </Field>
            <Field label="E-mail (optional)" htmlFor="email" className="sm:col-span-2">
              <Input id="email" type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} autoComplete="email" />
            </Field>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" checked={forSomeoneElse} onChange={(e) => setForSomeoneElse(e.target.checked)} className="h-4 w-4 accent-[#43291c]" />
              Someone else will collect or receive this order
            </label>
            {forSomeoneElse && (
              <>
                <Field label="Their name" htmlFor="rname"><Input id="rname" value={recipient.name} onChange={(e) => setRecipient({ ...recipient, name: e.target.value })} /></Field>
                <Field label="Their phone (optional)" htmlFor="rphone"><Input id="rphone" type="tel" value={recipient.phone} onChange={(e) => setRecipient({ ...recipient, phone: e.target.value })} /></Field>
              </>
            )}
            <Field label="Special instructions (optional)" htmlFor="instructions" hint="Mention any allergy here — the duty manager will call you. We cannot guarantee any dish is allergen-free." className="sm:col-span-2">
              <Textarea id="instructions" maxLength={300} value={instructions} onChange={(e) => setInstructions(e.target.value)} />
            </Field>
          </div>
        </section>

        {/* 3. Payment */}
        {quote && quote.paymentMethods.length > 0 && (
          <section aria-labelledby="pay-h">
            <h2 id="pay-h" className="text-3xl"><span className="text-brass-500">3.</span> Payment</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {quote.paymentMethods.map((p) => (
                <RadioCard key={p.id} name="payment" value={p.id} checked={payment === p.id} onChange={setPayment} title={p.label} />
              ))}
            </div>
            <p className="mt-3 text-sm text-muted">No card details are taken online. This is a test environment — no real payment is ever collected.</p>
          </section>
        )}
      </div>

      {/* Summary */}
      <aside aria-labelledby="summary-h" className="lg:sticky lg:top-[110px] lg:self-start">
        <h2 id="summary-h" className="eyebrow mb-3">Order summary</h2>
        {quote ? (
          <div className="rounded-2xl bg-white ring-1 ring-sand-200">
            <ul className="divide-y divide-sand-200">
              {quote.lines.map((l) => (
                <li key={l.lineIndex} className="flex justify-between gap-3 p-4 text-sm">
                  <span>
                    <span className="font-medium text-date-900">{l.quantity} × {l.name}</span>
                    {l.options.length > 0 && <span className="block text-xs text-muted">{l.options.map((o) => o.name).join(" · ")}</span>}
                  </span>
                  <span className="shrink-0 tabular-nums">{l.lineTotal.formatted}</span>
                </li>
              ))}
            </ul>
            <dl className="space-y-1 border-t border-sand-200 p-4 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd className="tabular-nums">{quote.totals.subtotal.formatted}</dd></div>
              {type === "delivery" && <div className="flex justify-between"><dt className="text-muted">Delivery</dt><dd className="tabular-nums">{quote.totals.deliveryFee.formatted}</dd></div>}
              <div className="flex justify-between pt-2 font-display text-2xl font-semibold text-date-800"><dt>Total</dt><dd className="tabular-nums">{quote.totals.total.formatted}</dd></div>
              <div className="flex justify-between text-xs text-muted"><dt>Includes VAT (5%)</dt><dd>{quote.totals.vatIncluded.formatted}</dd></div>
            </dl>
            <div className="space-y-3 border-t border-sand-200 p-4">
              {quote.issues.map((i, idx) => (
                <Alert key={idx} tone={i.code === "ITEM_UNAVAILABLE" ? "warning" : "error"}>
                  {i.message}
                  {Array.isArray(i.details?.alternatives) && (i.details!.alternatives as { time?: string; at?: string; name?: string }[]).length > 0 && i.details!.alternatives && (
                    <span className="mt-2 flex flex-wrap gap-2">
                      {(i.details!.alternatives as { time?: string; at?: string; name?: string; slug?: string }[]).slice(0, 4).map((a, k) =>
                        a.time && a.at ? (
                          <button key={k} type="button" className="rounded-full bg-white px-3 py-1 text-xs text-date-800 ring-1 ring-sand-300 no-underline" onClick={() => { setAsap(false); setDate(a.at!.slice(0, 10)); setTime(a.time!); }}>
                            {formatDateShort(a.at.slice(0, 10))} {a.time}
                          </button>
                        ) : a.name ? (
                          <span key={k} className="rounded-full bg-white px-3 py-1 text-xs text-date-800 ring-1 ring-sand-300">Try: {a.name}</span>
                        ) : null,
                      )}
                    </span>
                  )}
                </Alert>
              ))}
              {quote.requiresManualReview && <Alert tone="info">This order will be confirmed by our team by phone before it is accepted.</Alert>}
              {submitError && <Alert tone="error" title="The order was not placed">{submitError.message}</Alert>}
              {touched && missing.length > 0 && <Alert tone="warning">Please add {missing.join(", ")}.</Alert>}
              <Button className="w-full" size="lg" onClick={submit} disabled={submitting || quoting || !quote.valid}>
                {submitting ? <Spinner label="Placing order" /> : `Place order · ${quote.totals.total.formatted}`}
              </Button>
              <p className="text-center text-xs text-muted">Your order is only confirmed when you see the confirmation page.</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center rounded-2xl bg-white p-10 ring-1 ring-sand-200"><Spinner label="Pricing your order" /></div>
        )}
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-date-800">Edit items</summary>
          <div className="mt-3"><CartPanel compact /></div>
        </details>
      </aside>
    </div>
  );
}
