"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, ClipboardList, KeyRound, LayoutDashboard, LogOut, Settings, UtensilsCrossed, Users } from "lucide-react";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { LogoMark } from "@/components/site/logo";

const NAV = [
  { href: "/admin", label: "Today", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ClipboardList },
  { href: "/admin/reservations", label: "Reservations", icon: Users },
  { href: "/admin/menu", label: "Menu & availability", icon: UtensilsCrossed },
  { href: "/admin/calendar", label: "Calendar & closures", icon: CalendarDays, admin: true },
  { href: "/admin/settings", label: "Settings", icon: Settings, admin: true },
  { href: "/admin/api-keys", label: "API keys", icon: KeyRound, admin: true },
];

export function AdminShell({ user, children }: { user: { name: string; email: string; role: string }; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  return (
    <div className="min-h-screen bg-sand-100 lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="bg-date-900 text-sand-200 lg:min-h-screen">
        <div className="flex items-center gap-3 px-5 py-5">
          <LogoMark className="h-9 text-brass-300" />
          <div>
            <p className="font-display text-lg text-sand-50">Bayt Al Ghaf</p>
            <p className="text-[0.65rem] tracking-[0.2em] uppercase text-sand-300">Back office</p>
          </div>
        </div>
        <nav aria-label="Admin" className="scrollbar-none flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible">
          {NAV.filter((n) => !n.admin || user.role === "admin").map((n) => {
            const active = n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined} className={cn("flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm", active ? "bg-white/10 text-sand-50" : "hover:bg-white/5")}>
                <n.icon className="h-4 w-4" aria-hidden="true" /> {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden border-t border-white/10 px-5 py-4 text-xs lg:block">
          <p className="text-sand-50">{user.name}</p>
          <p>{user.email} · {user.role}</p>
          <button
            type="button"
            className="mt-3 inline-flex items-center gap-2 text-sand-300 hover:text-sand-50"
            onClick={async () => {
              await api("/admin/auth/logout", { method: "POST", json: {} });
              router.replace("/admin/login");
            }}
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" /> Sign out
          </button>
          <Link href="/" className="mt-2 block text-sand-300 hover:text-sand-50">View website →</Link>
        </div>
      </aside>
      <main className="min-w-0 p-4 md:p-8">{children}</main>
    </div>
  );
}
