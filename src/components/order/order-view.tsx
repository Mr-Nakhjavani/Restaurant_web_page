"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Clock, MapPin, Phone } from "lucide-react";
import { api, ApiClientError } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { formatIsoDateTime } from "@/lib/format";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface Money { formatted: string; amountFils: number }
export interface OrderDto {
  number: string;
  kind: "regular" | "bulk";
  status: string;
  statusLabel: string;
  statusDescription: string;
  confirmed: boolean;
  type: "pickup" | "delivery" | "dine_in_preorder";
  customer: { name: string; phone: string; email: string | null };
  recipient: { name: string; phone: string | null } | null;
  items: { id: string; name: string; quantity: number; options: { name: string }[]; lineTotal: Money; status: string; removedReason: string | null; allergens: string[] }[];
  totals: { subtotal: Money; deliveryFee: Money; discount: Money; total: Money; vatIncluded: Money; depositRequired: Money };
  payment: { methodLabel: string; note: string };
  fulfilment: { promisedAt: string; date: string; time: string; estimatedWindow: { from: string; to: string } | null; holdUntil: string | null };
  deliveryAddress: { area: string; building: string; street: string; unit?: string } | null;
  reservationReference: string | null;
  specialInstructions: string | null;
  allergyNoteFlagged: boolean;
  requiresReview: boolean;
  reviewReason: string | null;
  allowedActions: { modify: boolean; cancel: boolean; cancellableUntil: string | null; reason: string | null };
  history: { at: string; status: string | null; note: string | null; type: string }[];
}

const FLOW: Record<string, string[]> = {
  pickup: ["confirmed", "preparing", "ready_for_pickup", "completed"],
  delivery: ["confirmed", "preparing", "out_for_delivery", "completed"],
  dine_in_preorder: ["confirmed", "preparing", "ready_to_serve", "completed"],
};
const STEP_LABEL: Record<string, string> = {
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready_for_pickup: "Ready to collect",
  out_for_delivery: "On its way",
  ready_to_serve: "Ready to serve",
  completed: "Completed",
};

export function OrderView({ number, auth }: { number: string; auth: { token?: string | null; phone?: string | null } }) {
  const [order, setOrder] = useState<OrderDto | null>(null);
  const [error, setError] = useState<ApiClientError | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const headers: Record<string, string> = auth.token ? { "X-Access-Token": auth.token } : auth.phone ? { "X-Customer-Phone": auth.phone } : {};

  const load = useCallback(async () => {
    try {
      const r = await api<{ data: OrderDto }>(`/orders/${encodeURIComponent(number)}`, { headers });
      setOrder(r.data);
      setError(null);
    } catch (e) {
      setError(e as ApiClientError);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [number, auth.token, auth.phone]);

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  const cancel = async () => {
    if (!window.confirm("Cancel this order? This cannot be undone.")) return;
    setCancelling(true);
    try {
      const r = await api<{ data: { order: OrderDto } }>(`/orders/${encodeURIComponent(number)}/cancel`, { method: "POST", headers, json: { reason: "Cancelled by customer on the website" } });
      setOrder(r.data.order);
    } catch (e) {
      setError(e as ApiClientError);
    } finally {
      setCancelling(false);
    }
  };

  if (error && !order) {
    return (
      <Alert tone="error" title={error.body.code === "RECORD_NOT_FOUND" ? "We couldn't find that order" : "Something went wrong"}>
        {error.body.code === "RECORD_NOT_FOUND" ? "Check the order number and the phone number you used." : error.message}
      </Alert>
    );
  }
  if (!order) return <div className="flex justify-center py-16"><Spinner label="Loading your order" /></div>;

  const flow = FLOW[order.type];
  const idx = flow.indexOf(order.status);
  const failed = ["cancelled", "rejected", "not_collected", "delivery_failed"].includes(order.status);
  return (
    <div className="space-y-8">
      <div className={cn("rounded-3xl p-6 md:p-8", failed ? "bg-danger-50 ring-1 ring-[#efc4bd]" : order.status === "pending_confirmation" ? "bg-warning-50 ring-1 ring-[#ecd3a5]" : "bg-success-50 ring-1 ring-[#c3dccb]")}>
        <p className="eyebrow">{order.kind === "bulk" ? "Catering order" : "Order"} {order.number}</p>
        <h2 className="mt-2 text-4xl md:text-5xl">{order.statusLabel}</h2>
        <p className="mt-3 max-w-2xl text-[0.95rem] text-ink">{order.status === "pending_confirmation" ? order.reviewReason ?? order.statusDescription : order.statusDescription}</p>
        {!failed && order.status !== "pending_confirmation" && (
          <ol className="mt-8 grid grid-cols-4 gap-2" aria-label="Order progress">
            {flow.map((s, i) => (
              <li key={s} className="text-center">
                <span className={cn("mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm ring-1", i <= idx ? "bg-date-800 text-sand-50 ring-date-800" : "bg-white text-muted ring-sand-300")} aria-current={i === idx ? "step" : undefined}>
                  {i < idx ? <Check className="h-4 w-4" aria-hidden="true" /> : i + 1}
                </span>
                <span className={cn("mt-2 block text-xs", i <= idx ? "text-date-900" : "text-muted")}>{STEP_LABEL[s]}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 ring-1 ring-sand-200">
          <p className="eyebrow mb-3">{order.type === "pickup" ? "Pickup" : order.type === "delivery" ? "Delivery" : "Dine-in pre-order"}</p>
          <p className="flex items-center gap-2 font-display text-2xl text-date-900">
            <Clock className="h-5 w-5 text-brass-700" aria-hidden="true" /> {formatIsoDateTime(order.fulfilment.promisedAt)}
            {order.fulfilment.estimatedWindow && `–${order.fulfilment.estimatedWindow.to}`}
          </p>
          {order.type === "pickup" && (
            <p className="mt-3 flex gap-2 text-sm text-muted"><MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> Takeaway counter, Heritage Quarter Gate 3, Al Seef Street. Quote your order number. We hold orders until {order.fulfilment.holdUntil ? formatIsoDateTime(order.fulfilment.holdUntil).split(", ")[1] : "an hour after the pickup time"}.</p>
          )}
          {order.deliveryAddress && (
            <p className="mt-3 flex gap-2 text-sm text-muted"><MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {[order.deliveryAddress.unit, order.deliveryAddress.building, order.deliveryAddress.street, order.deliveryAddress.area].filter(Boolean).join(", ")}</p>
          )}
          {order.reservationReference && <p className="mt-3 text-sm text-muted">Linked to reservation {order.reservationReference}.</p>}
          <p className="mt-3 flex gap-2 text-sm text-muted"><Phone className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {order.customer.name} · {order.customer.phone}{order.recipient ? ` · for ${order.recipient.name}` : ""}</p>
          {order.allergyNoteFlagged && <Alert tone="info" className="mt-4">You mentioned an allergy — our duty manager will call you before we cook. We cannot guarantee any dish is allergen-free.</Alert>}
        </div>
        <div className="rounded-2xl bg-white p-6 ring-1 ring-sand-200">
          <p className="eyebrow mb-3">Items</p>
          <ul className="space-y-2 text-sm">
            {order.items.map((i) => (
              <li key={i.id} className={cn("flex justify-between gap-3", i.status === "removed" && "text-muted line-through")}>
                <span>
                  {i.quantity} × {i.name}
                  {i.options.length > 0 && <span className="block text-xs text-muted">{i.options.map((o) => o.name).join(" · ")}</span>}
                  {i.removedReason && <span className="block text-xs no-underline">Removed: {i.removedReason}</span>}
                </span>
                <span className="shrink-0 tabular-nums">{i.lineTotal.formatted}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-1 border-t border-sand-200 pt-4 text-sm">
            {order.totals.discount.amountFils > 0 && <div className="flex justify-between"><dt className="text-muted">Discount</dt><dd>−{order.totals.discount.formatted}</dd></div>}
            {order.totals.deliveryFee.amountFils > 0 && <div className="flex justify-between"><dt className="text-muted">Delivery</dt><dd>{order.totals.deliveryFee.formatted}</dd></div>}
            <div className="flex justify-between font-display text-xl font-semibold text-date-800"><dt>Total</dt><dd>{order.totals.total.formatted}</dd></div>
            <div className="flex justify-between text-xs text-muted"><dt>Incl. VAT</dt><dd>{order.totals.vatIncluded.formatted}</dd></div>
          </dl>
          <p className="mt-3 text-xs text-muted">{order.payment.methodLabel}. {order.payment.note}</p>
        </div>
      </div>

      {error && <Alert tone="error">{error.message}</Alert>}
      <div className="flex flex-wrap items-center gap-4">
        {order.allowedActions.cancel && (
          <Button variant="danger" onClick={cancel} disabled={cancelling}>{cancelling ? <Spinner /> : "Cancel order"}</Button>
        )}
        <p className="text-sm text-muted">
          {order.allowedActions.cancel && order.allowedActions.cancellableUntil ? `Free cancellation until ${formatIsoDateTime(order.allowedActions.cancellableUntil)}. ` : ""}
          {order.allowedActions.reason ?? ""} To change items or the time, call +971 4 555 0142.
        </p>
      </div>
    </div>
  );
}
