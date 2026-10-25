import { DateTime } from "luxon";
import { catalogFromSeed, restaurantContextFromSeed } from "@/server/repositories/catalog-repo";
import type { CatalogItem } from "@/domain/catalog";

export const catalog = catalogFromSeed();
export const ctx = restaurantContextFromSeed();

/** A Dubai-local DateTime from "YYYY-MM-DDTHH:mm". */
export const dubai = (iso: string) => DateTime.fromISO(iso, { zone: "Asia/Dubai" });

export function item(id: string): CatalogItem {
  const found = catalog.itemsById.get(id);
  if (!found) throw new Error(`no item ${id}`);
  return found;
}

export function withItem(id: string, patch: Partial<CatalogItem>): CatalogItem {
  return { ...item(id), ...patch };
}
