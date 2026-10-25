import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/cn";

const styles = {
  info: { box: "bg-[#eef3f2] border-[#bfd3d1] text-creek-700", Icon: Info },
  success: { box: "bg-success-50 border-[#c3dccb] text-success-700", Icon: CheckCircle2 },
  warning: { box: "bg-warning-50 border-[#ecd3a5] text-warning-700", Icon: AlertTriangle },
  error: { box: "bg-danger-50 border-[#efc4bd] text-danger-700", Icon: XCircle },
};

export function Alert({ tone = "info", title, children, className }: { tone?: keyof typeof styles; title?: string; children?: ReactNode; className?: string }) {
  const { box, Icon } = styles[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("flex gap-3 rounded-xl border px-4 py-3 text-sm", box, className)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={cn(title && "mt-1", "text-[0.92rem] leading-relaxed [&_a]:underline")}>{children}</div>}
      </div>
    </div>
  );
}
