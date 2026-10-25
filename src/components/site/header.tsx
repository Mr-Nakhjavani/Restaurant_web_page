"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu as MenuIcon, ShoppingBag, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { buttonClass } from "@/components/ui/button";
import { Logo } from "./logo";
import { useCart } from "./cart-context";
import { NAV } from "./nav";

export { NAV };

export function SiteHeader({ phone }: { phone: string }) {
  const pathname = usePathname();
  const overHero = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { count, ready } = useCart();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const transparent = overHero && !scrolled && !open;
  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-colors duration-500",
        overHero && "-mb-[84px]",
        transparent ? "bg-transparent" : "bg-sand-50/95 shadow-[0_1px_0_rgb(43_26_17/0.08)] backdrop-blur",
      )}
    >
      <div className="container-page flex h-[84px] items-center justify-between gap-6">
        <Link href="/" aria-label="Bayt Al Ghaf — home" className="shrink-0">
          <Logo tone={transparent ? "light" : "dark"} />
        </Link>
        <nav aria-label="Main" className="hidden xl:block">
          <ul className="flex items-center gap-7">
            {NAV.map((n) => {
              const active = pathname === n.href || (n.href !== "/" && pathname.startsWith(n.href + "/"));
              return (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "link-underline pb-1 text-[0.78rem] font-medium tracking-[0.14em] uppercase",
                      transparent ? "text-sand-50" : "text-date-800",
                      active && "bg-[length:100%_1px]",
                    )}
                  >
                    {n.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href={count > 0 ? "/order/checkout" : "/order"}
            className={cn("relative rounded-full p-2.5 transition-colors", transparent ? "text-sand-50 hover:bg-white/10" : "text-date-800 hover:bg-sand-200/70")}
            aria-label={ready && count > 0 ? `Your order: ${count} item${count === 1 ? "" : "s"}` : "Order online"}
          >
            <ShoppingBag className="h-5 w-5" aria-hidden="true" />
            {ready && count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brass-500 px-1 text-[0.65rem] font-semibold text-date-900">
                {count}
              </span>
            )}
          </Link>
          <span className="hidden sm:inline-flex">
            <Link href="/reservations" className={buttonClass(transparent ? "outline-light" : "primary", "sm")}>
              Reserve a table
            </Link>
          </span>
          <button
            type="button"
            className={cn("rounded-full p-2.5 xl:hidden", transparent ? "text-sand-50 hover:bg-white/10" : "text-date-800 hover:bg-sand-200/70")}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label="Open menu"
            onClick={() => setOpen(true)}
          >
            <MenuIcon className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-menu" role="dialog" aria-modal="true" aria-label="Site menu" className="fixed inset-0 z-50 flex flex-col bg-date-900 text-sand-50 animate-[fade-in_0.25s_ease]">
          <div className="container-page flex h-[84px] items-center justify-between">
            <Logo tone="light" />
            <button ref={closeRef} type="button" onClick={() => setOpen(false)} className="rounded-full p-2.5 hover:bg-white/10" aria-label="Close menu">
              <X className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          <nav aria-label="Mobile" className="container-page flex-1 overflow-y-auto py-8">
            <ul className="space-y-1">
              {[{ href: "/", label: "Home" }, ...NAV].map((n, i) => (
                <li key={n.href} style={{ animationDelay: `${i * 40}ms` }} className="reveal">
                  <Link href={n.href} className="block py-2 font-display text-4xl text-sand-50 hover:text-brass-300">
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-10 space-y-2 border-t border-white/10 pt-8 text-sand-200">
              <p className="eyebrow eyebrow-light">Call us</p>
              <a href={`tel:${phone.replace(/\s/g, "")}`} className="text-xl">{phone}</a>
              <p className="pt-4 text-sm">Al Seef, Bur Dubai · Fictional test restaurant</p>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
