"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/cn";

interface Faq { id: string; category: string; question: string; answer: string; tags: string[] }

export function FaqBrowser({ items, categories }: { items: Faq[]; categories: string[] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const filtered = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
    return items.filter((f) => (!cat || f.category === cat) && (!words.length || words.every((w) => `${f.question} ${f.answer} ${f.tags.join(" ")}`.toLowerCase().includes(w))));
  }, [items, q, cat]);
  return (
    <div className="grid gap-10 lg:grid-cols-[260px_1fr]">
      <nav aria-label="FAQ topics" className="min-w-0 lg:sticky lg:top-[110px] lg:self-start">
        <label className="relative block">
          <span className="sr-only">Search questions</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search questions" className="field-input !rounded-full !pl-9" />
        </label>
        <ul className="scrollbar-none mt-4 flex gap-2 overflow-x-auto lg:flex-col lg:gap-1">
          <li><button type="button" onClick={() => setCat(null)} className={cn("w-full shrink-0 rounded-full px-3 py-1.5 text-left text-sm", !cat ? "bg-date-800 text-sand-50" : "hover:bg-sand-200")}>All topics</button></li>
          {categories.map((c) => (
            <li key={c}><button type="button" onClick={() => setCat(c)} className={cn("w-full shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-left text-sm", cat === c ? "bg-date-800 text-sand-50" : "hover:bg-sand-200")}>{c}</button></li>
          ))}
        </ul>
      </nav>
      <div className="min-w-0">
        <p className="mb-4 text-sm text-muted" aria-live="polite">{filtered.length} questions</p>
        <div className="divide-y divide-sand-200 rounded-3xl bg-white ring-1 ring-sand-200">
          {filtered.map((f) => (
            <details key={f.id} className="group p-5 open:bg-sand-50/60">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
                <span className="font-display text-xl text-date-900">{f.question}</span>
                <span className="mt-1 text-brass-700 transition group-open:rotate-45" aria-hidden="true">+</span>
              </summary>
              <p className="mt-3 max-w-3xl leading-relaxed text-muted">{f.answer}</p>
              <p className="mt-2 text-xs text-sand-400">{f.category}</p>
            </details>
          ))}
          {filtered.length === 0 && <p className="p-8 text-center text-muted">No questions match — try fewer words, or call us.</p>}
        </div>
      </div>
    </div>
  );
}
