"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api-client";
import { formatAed } from "@/lib/format";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QuantityStepper, Textarea } from "@/components/ui/fields";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { useCart } from "@/components/site/cart-context";

interface Option { id: string; name: string; priceDelta: { amountFils: number; formatted: string }; default: boolean; removes: string[]; adds: string[] }
interface Group { id: string; name: string; selection: "single" | "multiple"; required: boolean; min: number; max: number; options: Option[] }
interface Detail {
  id: string;
  slug: string;
  name: string;
  arabicName: string;
  price: { amountFils: number; formatted: string };
  image: { url: string; alt: string };
  description: string;
  allergens: string[];
  maxPerOrder: number;
  customizations: Group[];
  allergenDetails: { allergen: string; label: string }[];
}

export function CustomizeDialog({ slug, onClose }: { slug: string | null; onClose: () => void }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");
  const { add } = useCart();

  useEffect(() => {
    if (!slug) return;
    setDetail(null);
    setError(null);
    setQty(1);
    setNotes("");
    api<{ data: Detail }>(`/menu/items/${slug}`)
      .then((r) => {
        setDetail(r.data);
        setSelected(Object.fromEntries(r.data.customizations.map((g) => [g.id, g.options.filter((o) => o.default).map((o) => o.id)])));
      })
      .catch((e) => setError((e as Error).message));
  }, [slug]);

  const unitFils = useMemo(() => {
    if (!detail) return 0;
    const deltas = detail.customizations.flatMap((g) => g.options.filter((o) => selected[g.id]?.includes(o.id)).map((o) => o.priceDelta.amountFils));
    return Math.max(0, detail.price.amountFils + deltas.reduce((a, b) => a + b, 0));
  }, [detail, selected]);

  const choose = (g: Group, optionId: string) => {
    setSelected((prev) => {
      const cur = prev[g.id] ?? [];
      if (g.selection === "single") return { ...prev, [g.id]: [optionId] };
      const next = cur.includes(optionId) ? cur.filter((x) => x !== optionId) : cur.length < g.max ? [...cur, optionId] : cur;
      return { ...prev, [g.id]: next };
    });
  };

  const submit = () => {
    if (!detail) return;
    const options = Object.values(selected).flat();
    const labels = detail.customizations.flatMap((g) => g.options.filter((o) => selected[g.id]?.includes(o.id) && !o.default).map((o) => o.name));
    add({ itemId: detail.id, slug: detail.slug, name: detail.name, image: detail.image.url, quantity: qty, options, optionLabels: labels, unitPriceFils: unitFils, notes: notes.trim() || undefined });
    onClose();
  };

  return (
    <Dialog open={!!slug} onClose={onClose} title={detail?.name ?? "Loading…"}>
      {error && <Alert tone="error" className="m-6">{error}</Alert>}
      {!detail && !error && (
        <div className="flex justify-center p-12"><Spinner /></div>
      )}
      {detail && (
        <div>
          <div className="relative aspect-[16/8] bg-sand-200">
            <Image src={detail.image.url} alt={detail.image.alt} fill sizes="600px" className="photo-grade object-cover" />
          </div>
          <div className="space-y-6 p-6">
            <div>
              <p lang="ar" className="font-arabic text-xl text-brass-700">{detail.arabicName}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">{detail.description}</p>
              {detail.allergenDetails.length > 0 && <p className="mt-3 text-xs text-warning-700">Contains: {detail.allergenDetails.map((a) => a.label).join(", ")}.</p>}
            </div>
            {detail.customizations.map((g) => (
              <fieldset key={g.id}>
                <legend className="mb-2 flex items-baseline gap-2 text-sm font-medium text-date-800">
                  {g.name}
                  <span className="text-xs font-normal text-muted">{g.selection === "single" ? "choose one" : `optional · up to ${g.max}`}</span>
                </legend>
                <div className="space-y-2">
                  {g.options.map((o) => {
                    const checked = selected[g.id]?.includes(o.id) ?? false;
                    return (
                      <label key={o.id} className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm transition ${checked ? "border-date-800 bg-white" : "border-sand-300 hover:border-sand-400"}`}>
                        <span className="flex items-center gap-3">
                          <input type={g.selection === "single" ? "radio" : "checkbox"} name={g.id} checked={checked} onChange={() => choose(g, o.id)} className="h-4 w-4 accent-[#43291c]" />
                          <span>
                            {o.name}
                            {(o.removes.length > 0 || o.adds.length > 0) && (
                              <span className="block text-xs text-muted">
                                {o.removes.length > 0 && `without ${o.removes.join(", ").toLowerCase()}`}
                                {o.removes.length > 0 && o.adds.length > 0 && " · "}
                                {o.adds.length > 0 && `adds ${o.adds.join(", ").toLowerCase()}`}
                              </span>
                            )}
                          </span>
                        </span>
                        {o.priceDelta.amountFils !== 0 && <span className="shrink-0 text-muted">{o.priceDelta.amountFils > 0 ? "+" : ""}{o.priceDelta.formatted}</span>}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}
            <div>
              <label htmlFor="line-notes" className="mb-1.5 block text-sm font-medium text-date-800">Note for the kitchen <span className="font-normal text-muted">(optional)</span></label>
              <Textarea id="line-notes" maxLength={200} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. extra crispy" className="min-h-16" />
              <p className="mt-1 text-xs text-muted">Allergies? Choose the options above and tell us at checkout — we can never guarantee an allergen-free dish.</p>
            </div>
          </div>
          <div className="sticky bottom-0 flex items-center justify-between gap-4 border-t border-sand-200 bg-sand-50 px-6 py-4">
            <QuantityStepper value={qty} onChange={setQty} max={Math.min(10, detail.maxPerOrder)} label="quantity" />
            <Button onClick={submit}>Add · {formatAed(unitFils * qty)}</Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
