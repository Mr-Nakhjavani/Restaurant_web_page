import type { Metadata } from "next";
import { Accessibility, Bus, Car, Footprints, Mail, MessageCircle, ParkingCircle, Phone, Ship, Train } from "lucide-react";
import { PageHeader } from "@/components/site/page-header";
import { MapPlaceholder } from "@/components/site/map-placeholder";
import { loadRestaurantContext } from "@/server/repositories/catalog-repo";
import { getHours } from "@/server/services/restaurant-service";
import { nowInDubai } from "@/domain/time";
import { formatDateShort } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Visit & contact", description: "Address, directions, parking, opening hours and contact details for Bayt Al Ghaf, Al Seef, Dubai (fictional)." };

export default async function ContactPage() {
  const rc = await loadRestaurantContext();
  const hours = await getHours(nowInDubai(), undefined, 7);
  const p = rc.profile;
  const t = p.transportation;
  const blocks = [
    { icon: Car, title: "By car", lines: t.byCar },
    { icon: ParkingCircle, title: "Parking", lines: t.parking },
    { icon: Train, title: "By metro", lines: t.byMetro },
    { icon: Ship, title: "By abra", lines: t.byAbra },
    { icon: Bus, title: "By bus or taxi", lines: [...t.byBus, ...t.byTaxi] },
    { icon: Footprints, title: "On foot", lines: t.onFoot },
    { icon: Accessibility, title: "Accessibility", lines: t.accessibility },
  ];
  return (
    <>
      <PageHeader eyebrow="Visit · زورونا" title="Find us on Al Seef" intro={t.summary} image="/images/site/abra.jpg" />
      <section className="container-page grid gap-12 py-16 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-10">
          <div>
            <p className="eyebrow mb-3">Address</p>
            <address className="not-italic text-lg leading-relaxed">
              {p.name}<br />{p.address.unit}<br />{p.address.street}, {p.address.area}<br />{p.address.city}, {p.address.country}
            </address>
            <p className="mt-2 text-sm text-muted">Entrance and takeaway counter: Heritage Quarter Gate 3. Approximate coordinates {p.coordinates.latitude}, {p.coordinates.longitude} (fictional location).</p>
          </div>
          <div>
            <p className="eyebrow mb-3">Contact</p>
            <ul className="space-y-3">
              <li className="flex items-center gap-3"><Phone className="h-4 w-4 text-brass-700" aria-hidden="true" /> <a className="link-underline" href={`tel:${p.contact.phoneE164}`}>{p.contact.phone}</a> <span className="text-sm text-muted">reservations & orders</span></li>
              <li className="flex items-center gap-3"><MessageCircle className="h-4 w-4 text-brass-700" aria-hidden="true" /> {p.contact.whatsapp} <span className="text-sm text-muted">WhatsApp, text only</span></li>
              <li className="flex items-center gap-3"><Mail className="h-4 w-4 text-brass-700" aria-hidden="true" /> <a className="link-underline" href={`mailto:${p.contact.email}`}>{p.contact.email}</a></li>
              <li className="flex items-center gap-3"><Mail className="h-4 w-4 text-brass-700" aria-hidden="true" /> <a className="link-underline" href={`mailto:${p.contact.eventsEmail}`}>{p.contact.eventsEmail}</a> <span className="text-sm text-muted">catering & events</span></li>
            </ul>
            <p className="mt-3 text-xs text-muted">All contact details are simulated for this fictional restaurant.</p>
          </div>
          <div>
            <p className="eyebrow mb-3">Opening hours — next 7 days</p>
            <table className="w-full text-sm">
              <caption className="sr-only">Opening hours for the next seven days</caption>
              <tbody className="divide-y divide-sand-200">
                {hours.days.map((d) => (
                  <tr key={d.date}>
                    <th scope="row" className="py-2 text-left font-normal">{formatDateShort(d.date)}</th>
                    <td className="py-2">{d.isOpen ? `${d.opensAt} – ${d.closesAt === "24:00" ? "midnight" : d.closesAt}` : "Closed"}</td>
                    <td className="py-2 text-right text-xs text-muted">{d.notes[0] ?? `last orders ${d.kitchenLastOrderAt}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="space-y-10">
          <MapPlaceholder />
          <div className="grid gap-6 sm:grid-cols-2">
            {blocks.map((b) => (
              <div key={b.title}>
                <p className="flex items-center gap-2 font-display text-2xl text-date-900"><b.icon className="h-5 w-5 text-brass-700" aria-hidden="true" /> {b.title}</p>
                <ul className="mt-2 space-y-2 text-sm text-muted">{b.lines.map((l) => <li key={l}>{l}</li>)}</ul>
              </div>
            ))}
          </div>
          <div>
            <p className="eyebrow mb-3">Nearby landmarks</p>
            <ul className="grid gap-2 text-sm sm:grid-cols-2">
              {p.landmarks.map((l) => <li key={l.name} className="rounded-xl bg-white p-3 ring-1 ring-sand-200"><span className="font-medium text-date-800">{l.name}</span><br /><span className="text-muted">{l.distance} · {l.walk}</span></li>)}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
