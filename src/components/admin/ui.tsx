import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function AdminHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl bg-white p-5 ring-1 ring-sand-200", className)}>{children}</div>;
}

const STATUS_TONE: Record<string, string> = {
  pending_confirmation: "bg-warning-50 text-warning-700",
  confirmed: "bg-success-50 text-success-700",
  preparing: "bg-[#e7efee] text-creek-700",
  ready_for_pickup: "bg-[#e7efee] text-creek-700",
  out_for_delivery: "bg-[#e7efee] text-creek-700",
  ready_to_serve: "bg-[#e7efee] text-creek-700",
  seated: "bg-[#e7efee] text-creek-700",
  completed: "bg-sand-200 text-date-800",
  cancelled: "bg-danger-50 text-danger-700",
  rejected: "bg-danger-50 text-danger-700",
  no_show: "bg-danger-50 text-danger-700",
  not_collected: "bg-danger-50 text-danger-700",
  delivery_failed: "bg-danger-50 text-danger-700",
};

export function StatusPill({ status }: { status: string }) {
  return <span className={cn("inline-block rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_TONE[status] ?? "bg-sand-200")}>{status.replace(/_/g, " ")}</span>;
}
