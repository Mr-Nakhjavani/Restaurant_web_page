/**
 * Wording helpers for the RAG corpus. Everything here produces plain, self-contained
 * English that reads well when a section is retrieved on its own.
 */
import { formatAed } from "@/domain/money";
import { formatHumanDate, timeToMinutes } from "@/domain/time";
import { ALLERGENS, WEEKDAY_NAMES, type Allergen, type IsoWeekday, type SpiceLevel } from "@/domain/types";

export const aed = formatAed;

/** "AED 72 (72 dirhams)" — the dirham form matches how prices are said aloud. */
export function price(fils: number): string {
  const amount = fils / 100;
  const words = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
  return `${formatAed(fils)} (${words} dirhams)`;
}

/** "a", "a and b", "a, b and c". */
export function list(items: readonly string[], conjunction = "and"): string {
  const xs = items.filter(Boolean);
  if (xs.length === 0) return "";
  if (xs.length === 1) return xs[0];
  return `${xs.slice(0, -1).join(", ")} ${conjunction} ${xs[xs.length - 1]}`;
}

export function plural(n: number, singular: string, pluralForm = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}

/** 12-hour form used in speech: "8 am", "11:30 am", "noon", "midnight". */
export function time12(t: string): string {
  const m = timeToMinutes(t);
  if (m === 0 || m === 24 * 60) return "midnight";
  if (m === 12 * 60) return "noon";
  const h = Math.floor(m / 60) % 24;
  const min = m % 60;
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return min ? `${h12}:${String(min).padStart(2, "0")} ${suffix}` : `${h12} ${suffix}`;
}

/** "23:00 (11 pm)"; midnight closing is written "midnight (24:00)". */
export function time(t: string): string {
  if (t === "24:00" || t === "00:00") return `midnight (${t})`;
  return `${t} (${time12(t)})`;
}

export function timeRange(start: string, end: string): string {
  return `${time(start)} to ${time(end)}`;
}

/** "Tuesday 1 December 2026" */
export const date = formatHumanDate;

/** "1 December 2026" */
export function dateShort(iso: string): string {
  return formatHumanDate(iso).replace(/^\w+ /, "");
}

export function weekday(d: IsoWeekday): string {
  return WEEKDAY_NAMES[d];
}

export const WEEKDAYS: IsoWeekday[] = [1, 2, 3, 4, 5, 6, 7];

/** Customer-friendly allergen names. */
export const ALLERGEN_NAMES: Record<Allergen, string> = {
  gluten: "gluten (wheat)",
  crustaceans: "crustaceans (prawns and shrimp)",
  molluscs: "molluscs",
  eggs: "eggs",
  fish: "fish",
  peanuts: "peanuts",
  soy: "soy",
  milk: "milk (dairy)",
  tree_nuts: "tree nuts",
  celery: "celery",
  mustard: "mustard",
  sesame: "sesame",
  sulphites: "sulphites",
  lupin: "lupin",
};

export const ALLERGEN_TITLES: Record<Allergen, string> = {
  gluten: "Gluten (wheat)",
  crustaceans: "Crustaceans (prawns and shrimp)",
  molluscs: "Molluscs",
  eggs: "Eggs",
  fish: "Fish",
  peanuts: "Peanuts",
  soy: "Soy",
  milk: "Milk and dairy",
  tree_nuts: "Tree nuts",
  celery: "Celery",
  mustard: "Mustard",
  sesame: "Sesame",
  sulphites: "Sulphites",
  lupin: "Lupin",
};

export function allergens(list_: readonly Allergen[]): string {
  const sorted = [...list_].sort((a, b) => ALLERGENS.indexOf(a) - ALLERGENS.indexOf(b));
  return sorted.length ? list(sorted.map((a) => ALLERGEN_NAMES[a])) : "none of the 14 major allergens";
}

export const SPICE_WORDS: Record<SpiceLevel, string> = {
  0: "not spicy (spice level 0 of 3)",
  1: "mild (spice level 1 of 3)",
  2: "medium-hot (spice level 2 of 3)",
  3: "hot (spice level 3 of 3)",
};

/** Plural-looking names ("Walnuts", "Tree nuts") take plural verbs; "Hummus", "Gluten" do not. */
export function isPlural(name: string): boolean {
  const w = name.replace(/\s*\(.*\)\s*$/, "").trim().toLowerCase();
  return /s$/.test(w) && !/(ss|us|is)$/.test(w);
}
export const be = (name: string) => (isPlural(name) ? "are" : "is");
/** "contains" → "contain" for plural subjects. */
export const verb = (name: string, singular: string) => (isPlural(name) ? singular.replace(/s$/, "") : singular);

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Sentence-case the first character. */
export function cap(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

export function bullets(items: readonly string[]): string {
  return items.filter(Boolean).map((i) => `- ${i}`).join("\n");
}

export function paragraphs(...parts: (string | false | null | undefined)[]): string {
  return parts.filter((p): p is string => typeof p === "string" && p.trim().length > 0).join("\n\n");
}

export function stripTrailingDot(s: string): string {
  return s.replace(/[.\s]+$/, "");
}

export function sentence(s: string): string {
  const t = s.trim();
  return /[.!?)]$/.test(t) ? t : `${t}.`;
}
