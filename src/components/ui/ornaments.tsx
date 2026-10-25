import { cn } from "@/lib/cn";

/** A band inspired by Al Sadu weaving: repeating diamonds and triangles. */
export function SaduBand({ className, tone = "brass" }: { className?: string; tone?: "brass" | "date" | "light" }) {
  const id = `sadu-${tone}`;
  const color = tone === "brass" ? "var(--color-brass-500)" : tone === "date" ? "var(--color-date-700)" : "var(--color-sand-200)";
  return (
    <svg aria-hidden="true" className={cn("h-3 w-full", className)} preserveAspectRatio="none">
      <defs>
        <pattern id={id} width="24" height="12" patternUnits="userSpaceOnUse">
          <path d="M0 12 6 6 0 0M24 12l-6-6 6-6" fill="none" stroke={color} strokeWidth="1" />
          <path d="M12 2 16 6 12 10 8 6Z" fill={color} />
        </pattern>
      </defs>
      <rect width="100%" height="12" fill={`url(#${id})`} />
    </svg>
  );
}

export function Divider({ className, label }: { className?: string; label?: string }) {
  return (
    <div className={cn("flex items-center gap-4 text-brass-500", className)} aria-hidden={label ? undefined : true}>
      <span className="h-px flex-1 bg-current opacity-50" />
      <svg viewBox="0 0 20 20" className="h-3 w-3" fill="currentColor" aria-hidden="true">
        <path d="M10 0 13 7 20 10 13 13 10 20 7 13 0 10 7 7Z" />
      </svg>
      {label && <span className="eyebrow">{label}</span>}
      {label && (
        <svg viewBox="0 0 20 20" className="h-3 w-3" fill="currentColor" aria-hidden="true">
          <path d="M10 0 13 7 20 10 13 13 10 20 7 13 0 10 7 7Z" />
        </svg>
      )}
      <span className="h-px flex-1 bg-current opacity-50" />
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  arabic,
  intro,
  align = "left",
  tone = "dark",
  className,
  as: As = "h2",
}: {
  eyebrow?: string;
  title: string;
  arabic?: string;
  intro?: string;
  align?: "left" | "center";
  tone?: "dark" | "light";
  className?: string;
  as?: "h1" | "h2";
}) {
  return (
    <div className={cn(align === "center" ? "mx-auto text-center" : "", "max-w-3xl", className)}>
      {eyebrow && <p className={cn("eyebrow mb-4", tone === "light" && "eyebrow-light")}>{eyebrow}</p>}
      <As className={cn("text-4xl md:text-5xl lg:text-[3.6rem]", tone === "light" && "!text-sand-50")}>
        {title}
        {arabic && (
          <span lang="ar" className={cn("font-arabic mt-3 block text-2xl md:text-3xl", tone === "light" ? "text-brass-300" : "text-brass-700")}>
            {arabic}
          </span>
        )}
      </As>
      {intro && <p className={cn("mt-6 text-lg leading-relaxed", tone === "light" ? "text-sand-200" : "text-muted")}>{intro}</p>}
    </div>
  );
}
