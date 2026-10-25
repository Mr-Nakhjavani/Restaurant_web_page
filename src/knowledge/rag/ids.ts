/**
 * Stable entity ids and document paths shared by the documents, the knowledge graph,
 * the chunks and the evaluation questions, so all four can be joined.
 */
import type { Allergen, DietaryTag, IsoWeekday, SeatingArea, SpecialPeriodDef } from "@/domain/types";
import { WEEKDAY_NAMES } from "@/domain/types";
import { slugify } from "./text";

const bare = (id: string, prefix: string) => slugify(id.replace(new RegExp(`^${prefix}_`), ""));

export const node = {
  restaurant: () => "restaurant:bayt-al-ghaf",
  person: (slug: string) => `person:${slug}`,
  category: (slug: string) => `category:${slug}`,
  dish: (slug: string) => `dish:${slug}`,
  preparation: (slug: string) => `preparation:${slug}`,
  ingredient: (id: string) => `ingredient:${bare(id, "ing")}`,
  allergen: (a: Allergen) => `allergen:${slugify(a)}`,
  diet: (t: DietaryTag | string) => `diet:${slugify(t)}`,
  option: (dishSlug: string, optionId: string) => `option:${dishSlug}/${slugify(optionId)}`,
  weekday: (d: IsoWeekday) => `weekday:${WEEKDAY_NAMES[d].toLowerCase()}`,
  mealPeriod: (slug: string) => `meal-period:${slug}`,
  period: (p: Pick<SpecialPeriodDef, "slug">) => `special-period:${p.slug}`,
  periodType: (t: string) => `special-period-type:${slugify(t)}`,
  closure: (id: string) => `closure:${bare(id, "cl")}`,
  seatingArea: (a: SeatingArea) => `seating-area:${a}`,
  table: (code: string) => `table:${slugify(code)}`,
  zone: (id: string) => `delivery-zone:${slugify(id)}`,
  area: (name: string) => `area:${slugify(name)}`,
  landmark: (name: string) => `landmark:${slugify(name)}`,
  orderType: (t: string) => `order-type:${slugify(t)}`,
  paymentMethod: (slug: string) => `payment-method:${slugify(slug)}`,
  policy: (slug: string) => `policy:${slug}`,
  facility: (slug: string) => `facility:${slug}`,
  contact: (slug: string) => `contact-channel:${slug}`,
  transport: (slug: string) => `transport:${slug}`,
  spiceLevel: (level: number) => `spice-level:${level}`,
  status: (kind: "order" | "reservation", s: string) => `${kind}-status:${slugify(s)}`,
  term: (slug: string) => `term:${slug}`,
};

export const docPath = {
  dish: (slug: string) => `documents/menu/dishes/${slug}.md`,
  category: (slug: string) => `documents/menu/categories/${slug}.md`,
  preparation: (slug: string) => `documents/menu/sauces-and-preparations/${slug}.md`,
  ingredient: (id: string) => `documents/menu/ingredients/${bare(id, "ing")}.md`,
  allergen: (a: Allergen) => `documents/allergens-and-diets/allergen-${slugify(a)}.md`,
  diet: (slug: string) => `documents/allergens-and-diets/diet-${slug}.md`,
  weekday: (d: IsoWeekday) => `documents/calendar/weekdays/${WEEKDAY_NAMES[d].toLowerCase()}.md`,
  period: (slug: string) => `documents/calendar/${slug}.md`,
  zone: (id: string) => `documents/delivery/${slugify(id)}.md`,
  seatingArea: (a: SeatingArea) => `documents/reservations/seating-${a}.md`,
  faq: (slug: string) => `documents/faq/${slug}.md`,
  policy: (slug: string) => `documents/policies/${slug}.md`,
};
