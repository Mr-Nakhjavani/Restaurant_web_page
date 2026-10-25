import { cn } from "@/lib/cn";

export function Spinner({ className, label = "Loading" }: { className?: string; label?: string }) {
  return (
    <span role="status" className={cn("inline-flex items-center gap-2", className)}>
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-sand-200/70", className)} aria-hidden="true" />;
}
