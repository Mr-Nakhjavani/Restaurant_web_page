import type { Metadata } from "next";
import { nowInDubai } from "@/domain/time";
import { PageHeader } from "@/components/site/page-header";
import { CateringForm } from "@/components/order/catering-form";
import { getMenuContext } from "@/server/services/menu-service";
import { money } from "@/domain/money";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Catering & large orders", description: "Office lunches, family gatherings and events: catering quotes with live capacity and notice checks." };

export default async function CateringPage() {
  const { catalog, ctx } = await getMenuContext();
  void nowInDubai;
  const items = catalog.items
    .filter((i) => i.isVisible && i.bulk.eligible)
    .map((i) => ({
      id: i.id,
      name: i.name,
      arabicName: i.arabicName,
      price: money(i.priceFils),
      servesPeople: i.portion.servesPeople,
      minQuantity: i.bulk.minQuantity ?? 1,
      maxPerDay: i.bulk.maxQuantityPerDay ?? null,
      minNoticeHours: i.bulk.minNoticeHours ?? null,
      bulkOnly: i.bulk.bulkOnly,
      note: i.bulk.note ?? null,
      options: i.customizations.find((g) => g.id === "main")?.options.map((o) => ({ id: o.id, name: o.name, priceDeltaFils: o.priceDeltaFils })) ?? [],
      image: i.image.src,
      category: catalog.categories.find((c) => c.id === i.categoryId)?.name ?? "",
    }));
  const b = ctx.settings.bulk;
  return (
    <>
      <PageHeader
        eyebrow="Catering · الولائم"
        title="Catering & large orders"
        intro={`For more than ${ctx.settings.ordering.maxPortionsPerOrder} portions: office lunches, family gatherings and celebrations. Get an instant quote with live capacity — our catering team confirms every order by phone within ${b.reviewResponseHours} hours.`}
        image="/images/menu/whole-lamb-ouzi.jpg"
      />
      <div className="container-page py-12 md:py-16">
        <div className="mb-12 grid gap-4 md:grid-cols-4">
          {[
            ["Notice", b.noticeTiers.map((t) => `${t.maxPortions} portions: ${t.hours} h`).join(" · ")],
            ["Capacity", `Up to ${b.maxPortionsPerOrder} portions per order, ${b.dailyCapacityPortions} per day`],
            ["Volume pricing", b.discountTiers.map((t) => `${t.percent}% off from ${t.minPortions} portions`).join(" · ")],
            ["Collection or delivery", `${b.fulfilmentStart}–${b.fulfilmentEnd} · Dubai only · deposit ${b.depositPercent}% above AED ${b.depositThresholdFils / 100}`],
          ].map(([t, d]) => (
            <div key={t} className="rounded-2xl bg-white p-5 ring-1 ring-sand-200">
              <p className="eyebrow">{t}</p>
              <p className="mt-2 text-sm text-ink">{d}</p>
            </div>
          ))}
        </div>
        <CateringForm items={items} />
      </div>
    </>
  );
}
