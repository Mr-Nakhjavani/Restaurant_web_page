import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Users } from "lucide-react";
import { nowInDubai } from "@/domain/time";
import { ALLERGEN_LABELS, type Allergen } from "@/domain/types";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DietBadges, KindBadge, SignatureMark, SpiceLevel } from "@/components/menu/item-bits";
import { availabilityWeek, getMenuItem } from "@/server/services/menu-service";
import { isApiError } from "@/server/errors";
import { formatDateShort } from "@/lib/format";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

async function load(slug: string) {
  try {
    return await getMenuItem(slug, nowInDubai(), {});
  } catch (e) {
    if (isApiError(e) && e.code === "NOT_FOUND") return null;
    throw e;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const item = await load((await params).slug);
  return item ? { title: `${item.name} (${item.arabicName})`, description: item.shortDescription } : { title: "Dish not found" };
}

export default async function MenuItemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = await load(slug);
  if (!item) notFound();
  const now = nowInDubai();
  const week = await availabilityWeek(item.id, now, item.fulfilment.pickup ? "pickup" : "dine_in");
  const orderable = !item.bulkOnly;

  return (
    <article className="pb-24">
      <div className="container-page pt-8">
        <Link href="/menu" className="inline-flex items-center gap-2 text-sm text-muted hover:text-date-800">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to the menu
        </Link>
      </div>
      <div className="container-page mt-6 grid gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] bg-sand-200 shadow-[var(--shadow-lift)]">
            <Image src={item.image.url} alt={item.image.alt} fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="photo-grade object-cover" />
          </div>
          <section aria-labelledby="week-h" className="mt-8 rounded-2xl bg-white p-6 ring-1 ring-sand-200">
            <h2 id="week-h" className="eyebrow">Availability this week ({item.fulfilment.pickup ? "pickup" : "dine-in"})</h2>
            <ul className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-7">
              {week.map((d) => (
                <li key={d.date} title={d.reason ?? (d.servingWindow ? `${d.servingWindow.start}–${d.servingWindow.end}` : "")} className={cn("rounded-xl px-2 py-3 text-center text-xs ring-1", d.orderable || (d.servingWindow && d.status !== "sold_out") ? "bg-success-50 text-success-700 ring-[#c3dccb]" : "bg-sand-100 text-muted ring-sand-200")}>
                  <span className="block font-medium">{formatDateShort(d.date).split(" ")[0]}</span>
                  <span className="block">{formatDateShort(d.date).split(" ").slice(1).join(" ")}</span>
                  <span className="mt-1 block text-[0.65rem]">{d.servingWindow ? `${d.servingWindow.start}–${d.servingWindow.end}` : "—"}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-muted">{item.availabilityNote}</p>
          </section>
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <KindBadge kind={item.kind} />
            {item.signature && <SignatureMark />}
          </div>
          <h1 className="mt-3 text-5xl md:text-6xl">{item.name}</h1>
          <p lang="ar" className="font-arabic mt-2 text-3xl text-brass-700">{item.arabicName}</p>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted">
            <span className="font-display text-3xl font-semibold text-date-800">{item.price.formatted}</span>
            <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4" aria-hidden="true" /> Serves {item.portion.servesPeople}</span>
            <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" aria-hidden="true" /> {item.prepTimeMinutes} min</span>
            <SpiceLevel level={item.spiceLevel} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2"><DietBadges tags={item.dietaryTags} /></div>
          <p className="mt-8 text-lg leading-relaxed text-ink">{item.description}</p>
          <p className="mt-4 text-sm text-muted"><strong className="font-medium text-date-800">Portion:</strong> {item.portion.description}</p>
          <p className="mt-2 text-sm text-muted"><strong className="font-medium text-date-800">Method:</strong> {item.cookingMethod}</p>
          <p className="mt-2 text-sm text-muted"><strong className="font-medium text-date-800">Spice:</strong> {item.spiceAdjustment.note}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            {orderable ? (
              <ButtonLink href={`/order?add=${item.slug}`} size="lg">Add to an order</ButtonLink>
            ) : (
              <ButtonLink href="/catering" size="lg">Request a catering quote</ButtonLink>
            )}
            <ButtonLink href="/reservations" variant="outline" size="lg">Book a table</ButtonLink>
          </div>

          <section aria-labelledby="allergen-h" className="mt-12">
            <h2 id="allergen-h" className="text-3xl">Allergens</h2>
            {item.allergenDetails.length === 0 ? (
              <p className="mt-3 text-muted">None of the 14 major allergens are ingredients of this dish.</p>
            ) : (
              <ul className="mt-4 divide-y divide-sand-200 rounded-2xl bg-white ring-1 ring-sand-200">
                {item.allergenDetails.map((a) => (
                  <li key={a.allergen} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-baseline sm:justify-between">
                    <span className="font-medium text-date-800">{a.label}</span>
                    <span className="text-sm text-muted">
                      from {a.sources.join("; ")}
                      {a.avoidableWith ? ` · can be left out: ${a.avoidableWith.join(" + ")}` : " · cannot be removed"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {item.mayContain.length > 0 && (
              <p className="mt-3 text-sm text-warning-700">May contain traces of: {item.mayContain.map((a) => ALLERGEN_LABELS[a as Allergen]).join(", ")}.</p>
            )}
            {item.crossContactNotes.map((n) => (
              <p key={n} className="mt-2 text-sm text-muted">{n}</p>
            ))}
            <p className="mt-4 rounded-xl bg-sand-100 p-4 text-xs leading-relaxed text-muted">{item.kitchenAllergenStatement}</p>
          </section>

          <section aria-labelledby="ingredients-h" className="mt-12">
            <h2 id="ingredients-h" className="text-3xl">What&apos;s in it</h2>
            <table className="mt-4 w-full text-left text-sm">
              <caption className="sr-only">Ingredients and quantities</caption>
              <thead className="text-xs tracking-wide text-muted uppercase">
                <tr><th scope="col" className="py-2 font-medium">Ingredient</th><th scope="col" className="py-2 font-medium">Quantity</th></tr>
              </thead>
              <tbody className="divide-y divide-sand-200">
                {item.ingredients.map((i) => (
                  <tr key={i.id}>
                    <td className="py-2 pr-4">
                      {i.name}
                      {i.allergens.length > 0 && <span className="ml-2 text-xs text-warning-700">({i.allergens.map((a) => ALLERGEN_LABELS[a as Allergen].split(" ")[0].toLowerCase()).join(", ")})</span>}
                      {i.removable && <Badge className="ml-2" tone="neutral">optional</Badge>}
                    </td>
                    <td className="py-2 text-muted">{i.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {item.sauces.length > 0 && (
              <div className="mt-6">
                <h3 className="eyebrow mb-3">Sauces & preparations</h3>
                <ul className="space-y-2 text-sm">
                  {item.sauces.map((s) => (
                    <li key={s.id} className="flex flex-wrap items-baseline gap-2">
                      <span className="font-medium text-date-800">{s.name}</span>
                      <span className="text-muted">— {s.role}{s.note ? `, ${s.note}` : ""}</span>
                      {s.allergens.length > 0 && <span className="text-xs text-warning-700">contains {s.allergens.map((a) => ALLERGEN_LABELS[a as Allergen].split(" ")[0].toLowerCase()).join(", ")}</span>}
                      {s.houseSpecial && <Badge tone="brass">house</Badge>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {item.customizations.length > 0 && (
            <section aria-labelledby="custom-h" className="mt-12">
              <h2 id="custom-h" className="text-3xl">Make it yours</h2>
              <ul className="mt-4 space-y-4">
                {item.customizations.map((g) => (
                  <li key={g.id}>
                    <p className="text-sm font-medium text-date-800">{g.name}</p>
                    <p className="mt-1 text-sm text-muted">
                      {g.options.map((o) => `${o.name}${o.priceDelta.amountFils ? ` (${o.priceDelta.amountFils > 0 ? "+" : ""}${o.priceDelta.formatted})` : ""}`).join(" · ")}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {item.customerQA.length > 0 && (
            <section aria-labelledby="qa-h" className="mt-12">
              <h2 id="qa-h" className="text-3xl">Questions guests ask</h2>
              <dl className="mt-4 space-y-5">
                {item.customerQA.map((qa) => (
                  <div key={qa.question}>
                    <dt className="font-medium text-date-800">{qa.question}</dt>
                    <dd className="mt-1 text-muted">{qa.answer}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {item.pairings.length > 0 && (
            <p className="mt-12 text-sm text-muted">
              <span className="eyebrow mr-2">Pairs well with</span>
              {item.pairings.map((p, i) => (
                <span key={p.id}>
                  {i > 0 && " · "}
                  <Link href={`/menu/${p.slug}`} className="text-date-800 underline decoration-brass-400 underline-offset-4">{p.name}</Link>
                </span>
              ))}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
