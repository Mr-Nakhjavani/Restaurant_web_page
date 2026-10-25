import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { AvailabilityNote, DietBadges, KindBadge, SignatureMark, SpiceLevel } from "./item-bits";

export interface CardItem {
  id: string;
  slug: string;
  name: string;
  arabicName: string;
  kind: string;
  shortDescription: string;
  price: { formatted: string; amountFils: number };
  spiceLevel: number;
  dietaryTags: string[];
  signature: boolean;
  image: { url: string; alt: string };
  availabilityNote: string;
  portion: { servesPeople: number };
  availability: { orderable: boolean; status: string; reasons: { code: string; message: string }[] };
}

export function MenuItemCard({ item, action, showAvailability = true, priority = false, href }: { item: CardItem; action?: ReactNode; showAvailability?: boolean; priority?: boolean; href?: string }) {
  const unavailable = showAvailability && !item.availability.orderable;
  const link = href ?? `/menu/${item.slug}`;
  return (
    <article className={cn("group flex flex-col overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-soft)] ring-1 ring-sand-200 transition-shadow duration-500 hover:shadow-[var(--shadow-lift)]")}>
      <Link href={link} className="relative block aspect-[4/3] overflow-hidden bg-sand-200" tabIndex={-1} aria-hidden="true">
        <Image
          src={item.image.url}
          alt=""
          fill
          priority={priority}
          sizes="(min-width: 1280px) 380px, (min-width: 768px) 45vw, 100vw"
          className={cn("photo-grade object-cover transition-transform duration-700 group-hover:scale-[1.04]", unavailable && "grayscale-[35%] opacity-90")}
        />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <KindBadge kind={item.kind} />
          {item.portion.servesPeople > 1 && <span className="rounded-full bg-date-900/75 px-2.5 py-0.5 text-[0.7rem] text-sand-50 backdrop-blur">Serves {item.portion.servesPeople}</span>}
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {item.signature && <SignatureMark />}
            <h3 className="mt-1 font-display text-[1.6rem] leading-tight text-date-900">
              <Link href={link} className="link-underline">{item.name}</Link>
            </h3>
            <p lang="ar" className="font-arabic text-lg text-brass-700">{item.arabicName}</p>
          </div>
          <p className="shrink-0 pt-1 font-display text-xl font-semibold text-date-800" aria-label={`Price ${item.price.formatted}`}>
            {item.price.formatted}
          </p>
        </div>
        <p className="mt-3 text-[0.95rem] leading-relaxed text-muted">{item.shortDescription}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <DietBadges tags={item.dietaryTags} compact />
          <SpiceLevel level={item.spiceLevel} />
        </div>
        {showAvailability && <AvailabilityNote availability={item.availability} />}
        {action && <div className="mt-auto pt-5">{action}</div>}
      </div>
    </article>
  );
}
