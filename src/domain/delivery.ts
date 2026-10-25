import type { DeliveryZone, RestaurantSettings } from "./settings";

const normalise = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’`]/g, "")
    .replace(/\b(al|el)[\s-]+/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Common alternative spellings customers use for served areas. */
const AREA_ALIASES: Record<string, string> = {
  "bastakiya": "Al Fahidi",
  "al bastakiya": "Al Fahidi",
  "meena bazaar": "Bur Dubai",
  "meena bazar": "Bur Dubai",
  "karama": "Al Karama",
  "oud mehta": "Oud Metha",
  "zabeel": "Za'abeel",
  "satwa": "Al Satwa",
  "deira city centre": "Port Saeed",
  "downtown": "Downtown Dubai",
  "dubai downtown": "Downtown Dubai",
  "festival city": "Dubai Festival City",
  "garhoud": "Al Garhoud",
  "difc": "DIFC",
  "world trade centre": "Trade Centre",
  "marina": "Dubai Marina",
  "jlt": "Jumeirah Lakes Towers",
  "the palm": "Palm Jumeirah",
  "barsha": "Al Barsha",
};

export interface ZoneMatch {
  zone: DeliveryZone;
  area: string;
}

export function findDeliveryZone(area: string, settings: RestaurantSettings): ZoneMatch | null {
  const target = normalise(area);
  if (!target) return null;
  const aliasKey = Object.keys(AREA_ALIASES).find((k) => normalise(k) === target);
  const canonical = aliasKey ? normalise(AREA_ALIASES[aliasKey]) : target;
  for (const zone of settings.delivery.zones) {
    for (const a of zone.areas) {
      if (normalise(a) === canonical) return { zone, area: a };
    }
  }
  return null;
}

export function allServedAreas(settings: RestaurantSettings, regularOnly: boolean): string[] {
  return settings.delivery.zones.filter((z) => !regularOnly || z.regularOrders).flatMap((z) => z.areas);
}

export function deliveryFee(zone: DeliveryZone, subtotalFils: number): number {
  if (zone.freeDeliveryAboveFils !== null && subtotalFils >= zone.freeDeliveryAboveFils) return 0;
  return zone.feeFils;
}
