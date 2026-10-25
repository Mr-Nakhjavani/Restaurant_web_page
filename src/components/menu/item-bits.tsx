import { Flame, Leaf, Fish, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

export interface ItemLike {
  kind: string;
  kindLabel?: string;
  spiceLevel: number;
  dietaryTags: string[];
  signature?: boolean;
  availability?: { orderable: boolean; status: string; reasons: { code: string; message: string }[] };
}

export function SpiceLevel({ level, className }: { level: number; className?: string }) {
  if (level <= 0) return null;
  const label = ["Not spicy", "Mild", "Medium", "Hot"][level];
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-[#a2452f]", className)} title={`Spice: ${label}`} aria-label={`Spice level: ${label}`}>
      {Array.from({ length: 3 }, (_, i) => (
        <Flame key={i} className={cn("h-3.5 w-3.5", i < level ? "opacity-100" : "opacity-20")} aria-hidden="true" />
      ))}
    </span>
  );
}

export function KindBadge({ kind }: { kind: string }) {
  if (kind === "daily_special") return <Badge tone="brass">Weekly special</Badge>;
  if (kind === "limited_time") return <Badge tone="creek">Limited time</Badge>;
  if (kind === "catering") return <Badge tone="neutral">Catering only</Badge>;
  return null;
}

export function DietBadges({ tags, compact = false }: { tags: string[]; compact?: boolean }) {
  const out = [];
  if (tags.includes("vegan")) out.push(<Badge key="vg" tone="green"><Leaf className="h-3 w-3" aria-hidden="true" />Vegan</Badge>);
  else if (tags.includes("vegetarian")) out.push(<Badge key="v" tone="green"><Leaf className="h-3 w-3" aria-hidden="true" />Vegetarian</Badge>);
  if (tags.includes("pescatarian")) out.push(<Badge key="p" tone="creek"><Fish className="h-3 w-3" aria-hidden="true" />Seafood</Badge>);
  if (!compact && tags.includes("gluten_free_ingredients")) out.push(<Badge key="gf" tone="neutral" title="No gluten-containing ingredients; not certified gluten-free">No gluten ingredients</Badge>);
  return <>{out}</>;
}

export function SignatureMark() {
  return (
    <span className="inline-flex items-center gap-1 text-[0.68rem] font-medium tracking-[0.18em] text-brass-700 uppercase">
      <Star className="h-3 w-3 fill-current" aria-hidden="true" /> Signature
    </span>
  );
}

export function AvailabilityNote({ availability }: { availability?: ItemLike["availability"] }) {
  if (!availability || availability.orderable) return null;
  const first = availability.reasons[0];
  return (
    <p className={cn("mt-2 text-xs", availability.status === "sold_out" ? "text-danger-700" : "text-warning-700")}>
      {availability.status === "sold_out" ? "Sold out — " : ""}
      {first?.message}
    </p>
  );
}
