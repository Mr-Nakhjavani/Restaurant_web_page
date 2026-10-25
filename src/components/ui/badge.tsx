import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "brass" | "green" | "amber" | "red" | "creek" | "dark";
const tones: Record<Tone, string> = {
  neutral: "bg-sand-100 text-date-800 ring-sand-300",
  brass: "bg-[#f6ecd8] text-brass-700 ring-brass-300",
  green: "bg-success-50 text-success-700 ring-[#c3dccb]",
  amber: "bg-warning-50 text-warning-700 ring-[#ecd3a5]",
  red: "bg-danger-50 text-danger-700 ring-[#efc4bd]",
  creek: "bg-[#e7efee] text-creek-700 ring-[#bfd3d1]",
  dark: "bg-date-900/80 text-sand-50 ring-transparent backdrop-blur",
};

export function Badge({ tone = "neutral", children, className, title }: { tone?: Tone; children: ReactNode; className?: string; title?: string }) {
  return (
    <span title={title} className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.7rem] font-medium tracking-wide ring-1 ring-inset", tones[tone], className)}>
      {children}
    </span>
  );
}
