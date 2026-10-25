import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "outline" | "ghost" | "light" | "outline-light" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-sans font-medium tracking-[0.08em] uppercase transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2";
const variants: Record<Variant, string> = {
  primary: "bg-date-800 text-sand-50 hover:bg-date-900 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-lift)]",
  outline: "border border-brass-500 text-date-800 hover:bg-date-800 hover:border-date-800 hover:text-sand-50",
  ghost: "text-date-800 hover:bg-sand-200/60",
  light: "bg-sand-50 text-date-900 hover:bg-white",
  "outline-light": "border border-sand-200/70 text-sand-50 hover:bg-sand-50 hover:text-date-900",
  danger: "border border-danger-700 text-danger-700 hover:bg-danger-700 hover:text-white",
};
const sizes: Record<Size, string> = {
  sm: "px-4 py-2 text-[0.68rem]",
  md: "px-6 py-3 text-[0.72rem]",
  lg: "px-8 py-4 text-[0.78rem]",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({ variant = "primary", size = "md", className, ...props }: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({ href, variant = "primary", size = "md", className, children, ...props }: { href: string; variant?: Variant; size?: Size; className?: string; children: ReactNode } & Omit<ComponentProps<typeof Link>, "href" | "className">) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)} {...props}>
      {children}
    </Link>
  );
}
