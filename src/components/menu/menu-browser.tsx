"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { addDaysIso, formatDateShort, todayInDubai } from "@/lib/format";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { MenuItemCard, type CardItem } from "./item-card";

interface Category {
  id: string;
  slug: string;
  name: string;
  arabicName: string;
  description: string;
  itemCount: number;
}

type Item = CardItem & { category: { id: string; slug: string; name: string }; allergens: string[] };

const DIET_FILTERS = [
  { id: "vegetarian", label: "Vegetarian" },
  { id: "vegan", label: "Vegan" },
  { id: "gluten_free_ingredients", label: "No gluten ingredients" },
  { id: "dairy_free", label: "No dairy" },
] as const;
const ALLERGEN_FILTERS = [
  { id: "tree_nuts", label: "Nuts" },
  { id: "sesame", label: "Sesame" },
  { id: "crustaceans", label: "Shellfish" },
  { id: "fish", label: "Fish" },
  { id: "eggs", label: "Eggs" },
  { id: "milk", label: "Dairy" },
  { id: "gluten", label: "Gluten" },
] as const;
const MODES = [
  { id: "dine_in", label: "Dining in" },
  { id: "pickup", label: "Pickup" },
  { id: "delivery", label: "Delivery" },
] as const;
const VIEWS = [
  { id: "all", label: "Everything" },
  { id: "specials", label: "Specials & seasonal" },
  { id: "catering", label: "Catering" },
] as const;

export function MenuBrowser({
  initialItems,
  categories,
  initialView,
  initialCategory,
  kitchenStatement,
}: {
  initialItems: Item[];
  categories: Category[];
  initialView: "all" | "specials";
  initialCategory?: string;
  kitchenStatement: string;
}) {
  const [items, setItems] = useState<Item[]>(initialItems);
  const [search, setSearch] = useState("");
  const [diet, setDiet] = useState<string[]>([]);
  const [exclude, setExclude] = useState<string[]>([]);
  const [view, setView] = useState<string>(initialView);
  const [date, setDate] = useState<string>(todayInDubai());
  const [mode, setMode] = useState<string>("dine_in");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      if (initialCategory) document.getElementById(`cat-${initialCategory}`)?.scrollIntoView();
      return;
    }
    const controller = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ date, mode });
      if (search.trim()) params.set("search", search.trim());
      if (diet.length) params.set("dietary", diet.join(","));
      if (exclude.length) params.set("excludeAllergens", exclude.join(","));
      try {
        const res = await api<{ data: Item[] }>(`/menu?${params}`, { signal: controller.signal });
        setItems(res.data);
      } catch (e) {
        if (!controller.signal.aborted) setError((e as Error).message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, search ? 300 : 0);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [search, diet, exclude, date, mode, initialCategory]);

  const visible = useMemo(
    () =>
      items.filter((i) => {
        if (view === "specials" && !(i.kind === "daily_special" || i.kind === "limited_time")) return false;
        if (view === "catering" && !(i.kind === "catering" || i.portion.servesPeople >= 4)) return false;
        if (availableOnly && !i.availability.orderable) return false;
        return true;
      }),
    [items, view, availableOnly],
  );
  const grouped = categories.map((c) => ({ c, items: visible.filter((i) => i.category.id === c.id) })).filter((g) => g.items.length > 0);
  const activeFilterCount = diet.length + exclude.length + (availableOnly ? 1 : 0);
  const toggle = (list: string[], set: (v: string[]) => void, id: string) => set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const dates = Array.from({ length: 8 }, (_, i) => addDaysIso(todayInDubai(), i));

  return (
    <div className="container-page pb-24">
      {/* Controls ---------------------------------------------------------- */}
      <div className="sticky top-[84px] z-30 -mx-5 border-b border-sand-200 bg-sand-50/95 px-5 py-4 backdrop-blur md:-mx-10 md:px-10">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Search the menu</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search dishes, ingredients — e.g. majboos, dried lime, prawns"
              className="field-input !rounded-full !pl-10"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="menu-date">Availability date</label>
            <select id="menu-date" value={date} onChange={(e) => setDate(e.target.value)} className="field-input !w-auto !rounded-full !py-2 text-sm">
              {dates.map((d, i) => (
                <option key={d} value={d}>{i === 0 ? "Today" : i === 1 ? "Tomorrow" : formatDateShort(d)}</option>
              ))}
            </select>
            <div role="radiogroup" aria-label="How you will eat" className="flex rounded-full bg-sand-100 p-1 ring-1 ring-sand-200">
              {MODES.map((m) => (
                <button key={m.id} type="button" role="radio" aria-checked={mode === m.id} onClick={() => setMode(m.id)} className={cn("rounded-full px-3 py-1.5 text-xs font-medium transition", mode === m.id ? "bg-date-800 text-sand-50" : "text-date-800 hover:bg-sand-200")}>
                  {m.label}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters} className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium tracking-wide text-date-800 ring-1 ring-sand-300 hover:bg-sand-100">
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> Dietary {activeFilterCount > 0 && <span className="rounded-full bg-brass-500 px-1.5 text-date-900">{activeFilterCount}</span>}
            </button>
          </div>
        </div>
        {showFilters && (
          <div className="mt-4 grid gap-4 rounded-2xl bg-white p-4 ring-1 ring-sand-200 md:grid-cols-3">
            <fieldset>
              <legend className="eyebrow mb-2">Diet</legend>
              <div className="flex flex-wrap gap-2">
                {DIET_FILTERS.map((f) => (
                  <Chip key={f.id} active={diet.includes(f.id)} onClick={() => toggle(diet, setDiet, f.id)}>{f.label}</Chip>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="eyebrow mb-2">Without (as an ingredient)</legend>
              <div className="flex flex-wrap gap-2">
                {ALLERGEN_FILTERS.map((f) => (
                  <Chip key={f.id} active={exclude.includes(f.id)} onClick={() => toggle(exclude, setExclude, f.id)}>{f.label}</Chip>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="eyebrow mb-2">Availability</legend>
              <Chip active={availableOnly} onClick={() => setAvailableOnly((v) => !v)}>Only dishes available for this date & mode</Chip>
              {activeFilterCount > 0 && (
                <button type="button" onClick={() => { setDiet([]); setExclude([]); setAvailableOnly(false); }} className="mt-3 flex items-center gap-1 text-xs text-muted underline">
                  <X className="h-3 w-3" aria-hidden="true" /> Clear filters
                </button>
              )}
            </fieldset>
            <p className="text-xs text-muted md:col-span-3">{kitchenStatement}</p>
          </div>
        )}
        <div className="scrollbar-none mt-3 flex gap-2 overflow-x-auto">
          {VIEWS.map((v) => (
            <Chip key={v.id} active={view === v.id} onClick={() => setView(v.id)}>{v.label}</Chip>
          ))}
          <span className="mx-1 w-px shrink-0 bg-sand-300" aria-hidden="true" />
          {grouped.map(({ c }) => (
            <a key={c.id} href={`#cat-${c.slug}`} className="shrink-0 rounded-full px-3 py-1.5 text-xs text-date-800 hover:bg-sand-200">{c.name}</a>
          ))}
        </div>
      </div>

      <div aria-live="polite" className="mt-6 flex min-h-6 items-center gap-3 text-sm text-muted">
        {loading ? <Spinner label="Updating menu" /> : null}
        <span>{visible.length} dishes{date !== todayInDubai() || mode !== "dine_in" ? ` · availability for ${formatDateShort(date)}, ${MODES.find((m) => m.id === mode)?.label.toLowerCase()}` : ""}</span>
      </div>
      {error && <Alert tone="error" title="The menu could not be updated" className="mt-4">{error}</Alert>}

      {grouped.length === 0 && !loading && (
        <div className="mx-auto mt-16 max-w-md text-center">
          <p className="font-display text-3xl">No dishes match</p>
          <p className="mt-2 text-muted">Try a different spelling or remove a filter. Searches understand variants like “majboos”, “lugaimat” or “dried lemon”.</p>
        </div>
      )}

      {grouped.map(({ c, items: list }) => (
        <section key={c.id} id={`cat-${c.slug}`} aria-labelledby={`h-${c.slug}`} className="scroll-mt-48 pt-14">
          <div className="mb-8 flex flex-col gap-2 border-b border-sand-200 pb-6 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 id={`h-${c.slug}`} className="text-4xl md:text-5xl">{c.name}</h2>
              <p lang="ar" className="font-arabic mt-1 text-xl text-brass-700">{c.arabicName}</p>
            </div>
            <p className="max-w-md text-sm text-muted md:text-right">{c.description}</p>
          </div>
          <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((item) => (
              <MenuItemCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn("shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium tracking-wide transition", active ? "bg-date-800 text-sand-50" : "bg-white text-date-800 ring-1 ring-sand-300 hover:bg-sand-100")}
    >
      {children}
    </button>
  );
}
