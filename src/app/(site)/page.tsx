import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock, MapPin, Phone } from "lucide-react";
import { currentStatus, nextOpening } from "@/domain/hours";
import { nowInDubai } from "@/domain/time";
import { WEEKDAY_NAMES, type IsoWeekday } from "@/domain/types";
import { ButtonLink } from "@/components/ui/button";
import { Divider, SaduBand, SectionHeading } from "@/components/ui/ornaments";
import { MenuItemCard } from "@/components/menu/item-card";
import { MapPlaceholder } from "@/components/site/map-placeholder";
import { listMenu, listSpecials } from "@/server/services/menu-service";
import { loadRestaurantContext } from "@/server/repositories/catalog-repo";
import { formatDateLong } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const now = nowInDubai();
  const [rc, featured, specials] = await Promise.all([loadRestaurantContext(), listMenu(now, { featured: true }), listSpecials(now)]);
  const status = currentStatus(now, rc);
  const next = status.isOpen ? null : nextOpening(now, rc);
  const s = rc.settings;
  const p = rc.profile;
  const fmt = (t: string) => (t === "24:00" ? "midnight" : t);
  const featuredItems = featured.items.filter((i) => i.kind !== "catering").slice(0, 6);
  const weekly = specials.weeklySchedule;

  return (
    <>
      {/* Hero -------------------------------------------------------------- */}
      <section className="relative isolate flex min-h-[100svh] items-end overflow-hidden bg-date-900 text-sand-50">
        <Image src="/images/site/hero-creek.jpg" alt="Abras crossing Dubai Creek in golden evening light, with wind towers and a minaret on the Bur Dubai shore" fill priority sizes="100vw" className="-z-10 object-cover object-[60%_50%]" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-date-900 via-date-900/55 to-date-900/25" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-date-900/70 via-date-900/20 to-transparent" />
        <div className="container-page pb-16 pt-40 md:pb-24">
          <div className="max-w-3xl reveal">
            <p className="eyebrow eyebrow-light mb-6">Al Seef · Dubai Creek · Since {p.established}</p>
            <h1 className="font-display text-[3.4rem] leading-[0.98] font-medium !text-sand-50 sm:text-7xl lg:text-[6.2rem]">
              An Emirati table
              <br />
              <em className="font-normal text-brass-300">on the creek.</em>
            </h1>
            <p lang="ar" className="font-arabic mt-6 text-2xl text-sand-200 md:text-3xl">حيّاكم الله في بيت الغاف</p>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-sand-200">
              Slow-cooked machboos, harees beaten by hand, luqaimat warm from the pan and gahwa poured from the dallah — the dishes of Emirati homes, served in a coral-stone house by the water.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <ButtonLink href="/reservations" variant="light" size="lg">Reserve a table</ButtonLink>
              <ButtonLink href="/order" variant="outline-light" size="lg">Order for pickup</ButtonLink>
            </div>
          </div>
          <div className="mt-14 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-sand-200">
            <span className="inline-flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${status.isOpen ? "bg-[#7fc49a]" : "bg-sand-400"}`} aria-hidden="true" />
              {status.isOpen ? `Open now · until ${fmt(status.closesAt!)}` : next ? `Closed now · opens ${next.date === specials.date ? "" : "tomorrow "}at ${next.time}` : "Closed now"}
            </span>
            <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4" aria-hidden="true" /> Al Seef, Bur Dubai</span>
            <a href={`tel:${p.contact.phoneE164}`} className="inline-flex items-center gap-2 link-underline"><Phone className="h-4 w-4" aria-hidden="true" /> {p.contact.phone}</a>
          </div>
        </div>
      </section>

      {/* Story --------------------------------------------------------------- */}
      <section className="container-page grid items-center gap-14 py-24 md:py-32 lg:grid-cols-2 lg:gap-24">
        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
          <div className="arch relative aspect-[4/5] overflow-hidden bg-sand-200 shadow-[var(--shadow-lift)]">
            <Image src="/images/site/coffee-pour.jpg" alt="Arabic coffee being poured from a brass dallah into a small finjan cup" fill sizes="(min-width: 1024px) 40vw, 90vw" className="object-cover" />
          </div>
          <div className="absolute -bottom-10 -right-4 w-40 overflow-hidden rounded-2xl border-[6px] border-sand-50 shadow-[var(--shadow-lift)] sm:w-52 md:-right-10">
            <div className="relative aspect-square">
              <Image src="/images/site/dates.jpg" alt="A bowl of dates" fill sizes="220px" className="object-cover" />
            </div>
          </div>
        </div>
        <div>
          <SectionHeading eyebrow="Our house" title="Hospitality under the ghaf tree" arabic="كرم الضيافة تحت ظل الغاف" />
          <div className="prose-bayt mt-8 max-w-xl text-[1.05rem] leading-relaxed text-muted">
            <p>
              The ghaf is the national tree of the Emirates — the tree that gives shade where nothing else grows, and under which travellers were always offered water, dates and coffee. Bayt Al Ghaf is named for that welcome.
            </p>
            <p>
              Every guest is greeted with gahwa poured from the dallah and a few Khalas dates. Our kitchen grinds its own bezar each week, cooks harees overnight, and builds machboos the way Emirati families do: lamb and rice in the same pot, crowned with sweet hashu.
            </p>
          </div>
          <Link href="/about" className="mt-8 inline-flex items-center gap-2 text-sm font-medium tracking-[0.14em] text-date-800 uppercase link-underline">
            Read our story <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* Today's specials -------------------------------------------------------- */}
      <section className="on-dark relative overflow-hidden bg-date-900 py-24 text-sand-100 md:py-28">
        <SaduBand tone="brass" className="absolute inset-x-0 top-0 opacity-60" />
        <div className="container-page">
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <SectionHeading tone="light" eyebrow={`Today · ${formatDateLong(specials.date)}`} title="From today's kitchen" intro="Some dishes are cooked only on their day — a different Emirati classic every weekday, and the Friday family platter." />
            <ButtonLink href="/menu?view=specials" variant="outline-light">All specials</ButtonLink>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {specials.today.slice(0, 2).map((item) => (
              <MenuItemCard key={item.id} item={item} />
            ))}
            <div className={`flex flex-col justify-between rounded-2xl border border-white/10 p-8 ${specials.today.length === 0 ? "md:col-span-2 lg:col-span-3" : specials.today.length === 1 ? "lg:col-span-2" : ""}`}>
              <div>
                <p className="eyebrow eyebrow-light">Every day</p>
                <ul className="mt-6 space-y-5">
                  {[
                    ["Emirati breakfast", `Balaleet, chebab and regag from ${s.breakfast.start} to ${s.breakfast.end}.`],
                    ["Harees from 12:00", "Cooked overnight in one batch of thirty — until it is gone."],
                    ["Gahwa on arrival", "Every table is welcomed with coffee from the dallah and Khalas dates."],
                  ].map(([t, d]) => (
                    <li key={t} className="border-b border-white/10 pb-5 last:border-0">
                      <p className="font-display text-2xl text-sand-50">{t}</p>
                      <p className="mt-1 text-sm text-sand-200">{d}</p>
                    </li>
                  ))}
                </ul>
              </div>
              {specials.today.length === 0 && <p className="mt-6 text-sand-200">No day-specific dishes today — the full menu is available.</p>}
            </div>
          </div>
          <div className="mt-16 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-4 lg:grid-cols-7">
            {([1, 2, 3, 4, 5, 6, 7] as IsoWeekday[]).map((d) => {
              const dishes = weekly.filter((w) => w.days.includes(d));
              const isToday = now.weekday === d;
              return (
                <div key={d} className={`bg-date-900 p-4 ${isToday ? "ring-1 ring-inset ring-brass-400" : ""}`}>
                  <p className="eyebrow eyebrow-light">{WEEKDAY_NAMES[d].slice(0, 3)}{isToday ? " · today" : ""}</p>
                  <p className="mt-2 font-display text-lg leading-snug text-sand-50">{dishes.map((x) => x.name.replace(/\s*\((Monday|Tuesday|Wednesday|Thursday)\)/, "")).join(" · ") || "Full menu"}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured dishes ---------------------------------------------------------- */}
      <section className="container-page py-24 md:py-32">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <SectionHeading eyebrow="The menu" title="Dishes we are known for" arabic="أطباقنا المميزة" />
          <ButtonLink href="/menu" variant="outline">View the full menu</ButtonLink>
        </div>
        <div className="mt-14 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {featuredItems.map((item, i) => (
            <MenuItemCard key={item.id} item={item} priority={i < 3} />
          ))}
        </div>
      </section>

      {/* Rituals -------------------------------------------------------------------- */}
      <section className="bg-sand-100 py-24 md:py-28">
        <div className="container-page">
          <Divider label="The Emirati table" className="mx-auto max-w-xl" />
          <div className="mt-14 grid gap-12 md:grid-cols-3">
            {[
              { img: "/images/site/majlis.jpg", alt: "A traditional majlis room with cushioned seating", title: "The majlis", ar: "المجلس", text: "Two private rooms with floor seating for family gatherings of six to twenty, where gahwa is served from right to left and the dallah never runs dry." },
              { img: "/images/site/bread-baking.jpg", alt: "Hands spreading thin bread batter on a hot iron plate", title: "Bread made in front of you", ar: "خبز الرقاق", text: "Regag is spread paper-thin on the iron plate and folded around egg, cheese or mehyawa — breakfast as it is eaten in the old neighbourhoods." },
              { img: "/images/site/spices.jpg", alt: "Sacks of spices at the Dubai spice souk", title: "Our own bezar", ar: "البزار", text: "Cumin, coriander, fennel, cardamom, cinnamon and dried chilli, toasted and ground each week — the warm signature of every machboos." },
            ].map((r) => (
              <div key={r.title} className="text-center">
                <div className="arch relative mx-auto aspect-[3/4] w-full max-w-[300px] overflow-hidden bg-sand-200">
                  <Image src={r.img} alt={r.alt} fill sizes="300px" className="object-cover" />
                </div>
                <h3 className="mt-8 text-3xl">{r.title}</h3>
                <p lang="ar" className="font-arabic mt-1 text-xl text-brass-700">{r.ar}</p>
                <p className="mx-auto mt-4 max-w-sm text-muted">{r.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reserve / order -------------------------------------------------------------- */}
      <section className="grid md:grid-cols-2">
        <div className="relative isolate flex min-h-[520px] items-end overflow-hidden p-8 text-sand-50 md:p-14">
          <Image src="/images/site/terrace.jpg" alt="Guests dining on a waterfront terrace at dusk" fill sizes="(min-width: 768px) 50vw, 100vw" className="-z-10 object-cover" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-date-900/90 via-date-900/40 to-transparent" />
          <div className="max-w-md">
            <p className="eyebrow eyebrow-light">Reservations</p>
            <h2 className="mt-4 text-4xl !text-sand-50 md:text-5xl">A table by the water</h2>
            <p className="mt-4 text-sand-200">
              Book up to {s.reservations.maxAdvanceDays} days ahead for up to {s.reservations.maxPartySize} guests — indoors, at a creek-view window, on the terrace (mid-October to April) or in a private majlis.
            </p>
            <ButtonLink href="/reservations" variant="light" className="mt-8">Find a table</ButtonLink>
          </div>
        </div>
        <div className="relative isolate flex min-h-[520px] items-end overflow-hidden p-8 text-sand-50 md:p-14">
          <Image src="/images/menu/chicken-machboos.jpg" alt="Chicken machboos with caramelised onions and raisins" fill sizes="(min-width: 768px) 50vw, 100vw" className="photo-grade -z-10 object-cover" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-date-900/90 via-date-900/40 to-transparent" />
          <div className="max-w-md">
            <p className="eyebrow eyebrow-light">Pickup & delivery</p>
            <h2 className="mt-4 text-4xl !text-sand-50 md:text-5xl">Order ahead, collect on arrival</h2>
            <p className="mt-4 text-sand-200">
              Choose a time and we have it ready at the counter by Gate 3 — or delivered across central Dubai from {s.delivery.start} to {s.delivery.end}. Catering for offices and family gatherings, too.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/order" variant="light">Order online</ButtonLink>
              <ButtonLink href="/catering" variant="outline-light">Catering</ButtonLink>
            </div>
          </div>
        </div>
      </section>

      {/* Visit ----------------------------------------------------------------------- */}
      <section className="container-page grid gap-14 py-24 md:py-32 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <SectionHeading eyebrow="Visit us" title="Al Seef, on the Bur Dubai side of the creek" />
          <p className="mt-6 max-w-lg text-muted">{p.transportation.summary}</p>
          <dl className="mt-10 grid gap-8 sm:grid-cols-2">
            <div>
              <dt className="eyebrow mb-3 flex items-center gap-2"><Clock className="h-3.5 w-3.5" aria-hidden="true" /> Hours</dt>
              <dd className="space-y-1 text-[0.95rem]">
                <p>Mon – Thu & Sun · {s.weeklyHours["1"]!.open}–{fmt(s.weeklyHours["1"]!.close)}</p>
                <p>Fri – Sat · {s.weeklyHours["5"]!.open}–{fmt(s.weeklyHours["5"]!.close)}</p>
                <p className="text-muted">Breakfast {s.breakfast.start}–{s.breakfast.end}</p>
              </dd>
            </div>
            <div>
              <dt className="eyebrow mb-3 flex items-center gap-2"><MapPin className="h-3.5 w-3.5" aria-hidden="true" /> Address</dt>
              <dd className="text-[0.95rem]">
                {p.address.unit}, {p.address.street}
                <br />
                {p.address.area}, Dubai
              </dd>
            </div>
          </dl>
          <div className="mt-10 flex flex-wrap gap-3">
            <ButtonLink href="/contact" variant="primary">Directions & parking</ButtonLink>
            <ButtonLink href="/faq" variant="outline">Questions</ButtonLink>
          </div>
        </div>
        <MapPlaceholder />
      </section>
    </>
  );
}
