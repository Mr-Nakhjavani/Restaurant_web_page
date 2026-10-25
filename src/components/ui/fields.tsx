import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Field({ label, htmlFor, hint, error, required, children, className }: { label: string; htmlFor: string; hint?: string; error?: string | null; required?: boolean; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-date-800">
        {label}
        {required && <span className="text-danger-700" aria-hidden="true"> *</span>}
      </label>
      {children}
      {hint && !error && <p id={`${htmlFor}-hint`} className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p id={`${htmlFor}-error`} className="mt-1 text-xs text-danger-700">{error}</p>}
    </div>
  );
}

export function Input({ className, invalid, ...props }: ComponentProps<"input"> & { invalid?: boolean }) {
  return <input aria-invalid={invalid || undefined} className={cn("field-input", className)} {...props} />;
}

export function Select({ className, invalid, ...props }: ComponentProps<"select"> & { invalid?: boolean }) {
  return <select aria-invalid={invalid || undefined} className={cn("field-input", className)} {...props} />;
}

export function Textarea({ className, invalid, ...props }: ComponentProps<"textarea"> & { invalid?: boolean }) {
  return <textarea aria-invalid={invalid || undefined} className={cn("field-input min-h-24", className)} {...props} />;
}

export function RadioCard({ name, value, checked, onChange, title, description, disabled }: { name: string; value: string; checked: boolean; onChange: (v: string) => void; title: string; description?: string; disabled?: boolean }) {
  return (
    <label className={cn("relative flex cursor-pointer flex-col rounded-2xl border bg-white p-4 transition", checked ? "border-date-800 ring-1 ring-date-800" : "border-sand-300 hover:border-sand-400", disabled && "cursor-not-allowed opacity-50")}>
      <input type="radio" name={name} value={value} checked={checked} disabled={disabled} onChange={() => onChange(value)} className="sr-only" />
      <span className="font-medium text-date-900">{title}</span>
      {description && <span className="mt-1 text-xs leading-relaxed text-muted">{description}</span>}
      {checked && <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-date-800" aria-hidden="true" />}
    </label>
  );
}

export function QuantityStepper({ value, onChange, min = 1, max = 10, label }: { value: number; onChange: (n: number) => void; min?: number; max?: number; label: string }) {
  return (
    <div className="inline-flex items-center rounded-full ring-1 ring-sand-300" role="group" aria-label={label}>
      <button type="button" className="h-9 w-9 rounded-full text-lg text-date-800 hover:bg-sand-200 disabled:opacity-40" onClick={() => onChange(value - 1)} disabled={value <= min} aria-label={`Decrease ${label}`}>−</button>
      <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">{value}</span>
      <button type="button" className="h-9 w-9 rounded-full text-lg text-date-800 hover:bg-sand-200 disabled:opacity-40" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={`Increase ${label}`}>+</button>
    </div>
  );
}
