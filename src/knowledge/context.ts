import { createHash } from "node:crypto";
import type { Catalog } from "@/domain/catalog";
import { composeItem } from "@/domain/catalog";
import { formatAed } from "@/domain/money";
import { formatHumanDate } from "@/domain/time";
import { ALLERGEN_LABELS, DIETARY_TAG_LABELS, SPICE_LABELS, type Allergen, type DietaryTag, type SpiceLevel } from "@/domain/types";
import type { RestaurantContext } from "@/server/repositories/catalog-repo";

export interface KnowledgeContext {
  catalog: Catalog;
  rc: RestaurantContext;
  /** Short hash of all canonical data that feeds the documents. */
  dataVersion: string;
}

export function makeKnowledgeContext(catalog: Catalog, rc: RestaurantContext): KnowledgeContext {
  const payload = JSON.stringify({
    items: catalog.items.map(({ updatedAt: _u, ...rest }) => rest),
    ingredients: [...catalog.ingredientsById.values()],
    sauces: [...catalog.saucesById.values()],
    settings: rc.settings,
    profile: rc.profile,
    periods: rc.specialPeriods,
    closures: rc.closures,
    tables: rc.tables,
  });
  return { catalog, rc, dataVersion: createHash("sha256").update(payload).digest("hex").slice(0, 12) };
}

export const aed = formatAed;
export const human = formatHumanDate;
export const allergenList = (list: Allergen[]) => (list.length ? list.map((a) => ALLERGEN_LABELS[a]).join(", ") : "none of the 14 major allergens");
export const tagList = (list: DietaryTag[]) => list.filter((t) => t !== "halal").map((t) => DIETARY_TAG_LABELS[t]).join("; ");
export const spice = (l: number) => SPICE_LABELS[l as SpiceLevel];

export function table(headers: string[], rows: (string | number)[][]): string {
  const esc = (v: string | number) => String(v).replace(/\|/g, "\\|").replace(/\n/g, " ");
  return [`| ${headers.join(" | ")} |`, `| ${headers.map(() => "---").join(" | ")} |`, ...rows.map((r) => `| ${r.map(esc).join(" | ")} |`)].join("\n");
}

export function header(k: KnowledgeContext, id: string, title: string, purpose: string): string {
  return [
    `# ${title}`,
    "",
    `> **Fictional test restaurant.** ${k.rc.profile.name} (${k.rc.profile.arabicName}) does not exist. Its address, phone numbers, availability, prices and policies are simulated for testing an external voice assistant.`,
    ">",
    `> ${purpose}`,
    ">",
    `> Generated from the restaurant's canonical data (data version \`${k.dataVersion}\`). The live, always-current version of this document is served at \`GET /api/v1/knowledge/documents/${id}\`; live availability must always be checked through the API.`,
    "",
  ].join("\n");
}

export function itemsInCategory(k: KnowledgeContext, categoryId: string) {
  return k.catalog.items.filter((i) => i.categoryId === categoryId && i.isVisible);
}

export function itemComposition(k: KnowledgeContext, itemId: string) {
  const item = k.catalog.itemsById.get(itemId)!;
  return composeItem(k.catalog, item);
}

export function itemName(k: KnowledgeContext, id: string): string {
  return k.catalog.itemsById.get(id)?.name ?? id;
}

export function priceOf(k: KnowledgeContext, id: string): string {
  const item = k.catalog.itemsById.get(id);
  return item ? aed(item.priceFils) : "(unknown)";
}
