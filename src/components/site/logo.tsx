import { cn } from "@/lib/cn";

/** Ghaf tree inside a Gulf arch — the Bayt Al Ghaf mark. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 56" aria-hidden="true" className={cn("h-10 w-auto", className)} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <path d="M4 54V24a20 20 0 0 1 40 0v30" />
      <path d="M9 54V25a15 15 0 0 1 30 0v29" opacity="0.55" />
      <path d="M24 50V33" />
      <path d="M24 39c-3-2-6-2-8-1M24 36c3-2 6-2 8-1M24 42c-2-1-4-1-6 0M24 44c2-1 4-1 6 0" />
      <path d="M14 32c0-6 4.5-10 10-10s10 4 10 10c-3 1.5-6.5 2-10 2s-7-.5-10-2Z" />
      <path d="M17 50h14" />
    </svg>
  );
}

export function Logo({ tone = "dark", compact = false }: { tone?: "dark" | "light"; compact?: boolean }) {
  return (
    <span className={cn("flex items-center gap-3", tone === "light" ? "text-sand-50" : "text-date-900")}>
      <LogoMark className={cn("h-9 sm:h-11", tone === "light" ? "text-brass-300" : "text-brass-700")} />
      <span className="flex flex-col leading-none">
        <span className="font-display text-[1.2rem] font-semibold tracking-[0.08em] whitespace-nowrap uppercase sm:text-[1.45rem]">Bayt Al Ghaf</span>
        {!compact && (
          <span className={cn("mt-1 hidden items-center gap-2 text-[0.68rem] tracking-[0.25em] whitespace-nowrap uppercase min-[400px]:flex", tone === "light" ? "text-sand-200" : "text-muted")}>
            <span lang="ar" className="font-arabic text-[0.95rem] tracking-normal normal-case">بيت الغاف</span>
            <span aria-hidden="true">·</span>
            <span>Emirati Kitchen</span>
          </span>
        )}
      </span>
    </span>
  );
}
