import Link from "next/link";
import { minutesToTime, timeToMinutes } from "@/domain/time";
import type { RestaurantContext } from "@/server/repositories/catalog-repo";
import { SaduBand } from "@/components/ui/ornaments";
import { Logo } from "./logo";
import { NAV } from "./nav";

const DAY_GROUPS: { label: string; days: ("1" | "2" | "3" | "4" | "5" | "6" | "7")[] }[] = [
  { label: "Monday – Thursday", days: ["1", "2", "3", "4"] },
  { label: "Friday – Saturday", days: ["5", "6"] },
  { label: "Sunday", days: ["7"] },
];

export function SiteFooter({ rc }: { rc: RestaurantContext }) {
  const p = rc.profile;
  const s = rc.settings;
  const fmt = (t: string) => (t === "24:00" ? "midnight" : t);
  return (
    <footer className="on-dark relative mt-0 bg-date-900 text-sand-200">
      <SaduBand tone="brass" className="opacity-70" />
      <div className="container-page grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo tone="light" />
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-sand-200/90">{p.description.split(".")[0]}.</p>
          <p className="mt-6 text-xs leading-relaxed text-sand-300/80">
            <strong className="font-medium text-brass-300">A fictional restaurant.</strong> Bayt Al Ghaf is a realistic test environment for an AI voice assistant. Addresses, phone numbers,
            prices and availability are simulated — please do not visit, call or pay.
          </p>
        </div>
        <div>
          <p className="eyebrow eyebrow-light mb-4">Visit</p>
          <address className="not-italic text-sm leading-relaxed">
            {p.address.unit}
            <br />
            {p.address.street}, {p.address.area}
            <br />
            {p.address.city}, {p.address.country}
          </address>
          <p className="mt-4 text-sm">
            <a href={`tel:${p.contact.phoneE164}`} className="link-underline">{p.contact.phone}</a>
            <br />
            <a href={`mailto:${p.contact.email}`} className="link-underline">{p.contact.email}</a>
          </p>
        </div>
        <div>
          <p className="eyebrow eyebrow-light mb-4">Hours</p>
          <dl className="space-y-2 text-sm">
            {DAY_GROUPS.map((g) => {
              const h = s.weeklyHours[g.days[0]];
              return (
                <div key={g.label}>
                  <dt className="text-sand-300/80">{g.label}</dt>
                  <dd>{h ? `${fmt(h.open)} – ${fmt(h.close)}` : "Closed"}</dd>
                </div>
              );
            })}
            <div>
              <dt className="text-sand-300/80">Breakfast</dt>
              <dd>
                {s.breakfast.start} – {s.breakfast.end} · last orders {minutesToTime(timeToMinutes(s.weeklyHours["1"]!.close) - s.kitchenLastOrderMinutesBeforeClose)}
              </dd>
            </div>
          </dl>
        </div>
        <div>
          <p className="eyebrow eyebrow-light mb-4">Explore</p>
          <ul className="space-y-2 text-sm">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="link-underline">{n.label}</Link>
              </li>
            ))}
            <li><Link href="/order/track" className="link-underline">Track an order</Link></li>
            <li><Link href="/reservations/manage" className="link-underline">Manage a booking</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-3 py-6 text-xs text-sand-300/80 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} Bayt Al Ghaf (fictional). Prices in AED, VAT included. All meat halal · alcohol-free.</p>
          <p className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/credits" className="link-underline">Photo credits</Link>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- API route (Swagger UI), not a Next.js page */}
            <a href="/api/v1/docs" className="link-underline">API</a>
            <Link href="/admin" className="link-underline">Staff</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
