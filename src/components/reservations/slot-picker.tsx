"use client";

import { cn } from "@/lib/cn";

export interface Slot {
  time: string;
  at: string;
  available: boolean;
  areas: string[];
}

const PERIODS = [
  { label: "Breakfast", from: "00:00", to: "11:59" },
  { label: "Lunch", from: "12:00", to: "16:59" },
  { label: "Evening", from: "17:00", to: "23:59" },
];

export function SlotPicker({ slots, value, onChange, preference, partySize }: { slots: Slot[]; value: string | null; onChange: (t: string) => void; preference: string; partySize: number }) {
  const matches = (s: Slot) => s.available && (preference === "no_preference" ? s.areas.some((a) => a !== "majlis") || partySize > 14 : s.areas.includes(preference));
  return (
    <div className="space-y-6">
      {PERIODS.map((p) => {
        const list = slots.filter((s) => s.time >= p.from && s.time <= p.to);
        if (!list.length) return null;
        return (
          <div key={p.label}>
            <p className="eyebrow mb-2">{p.label}</p>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8" role="radiogroup" aria-label={`${p.label} times`}>
              {list.map((s) => {
                const ok = matches(s);
                return (
                  <button
                    key={s.time}
                    type="button"
                    role="radio"
                    aria-checked={value === s.time}
                    disabled={!ok}
                    onClick={() => onChange(s.time)}
                    title={ok ? `Available: ${s.areas.join(", ")}` : "No table for this party at this time"}
                    className={cn(
                      "rounded-lg px-2 py-2 text-sm tabular-nums ring-1 transition",
                      value === s.time ? "bg-date-800 text-sand-50 ring-date-800" : ok ? "bg-white text-date-800 ring-sand-300 hover:bg-sand-100" : "cursor-not-allowed text-sand-400 line-through ring-sand-200",
                    )}
                  >
                    {s.time}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
