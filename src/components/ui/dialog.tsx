"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

/** Accessible modal built on the native <dialog> element (focus containment, Escape to close). */
export function Dialog({ open, onClose, title, children, className, wide = false }: { open: boolean; onClose: () => void; title: string; children: ReactNode; className?: string; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-label={title}
      className={cn(
        "m-auto max-h-[92vh] w-[calc(100%-2rem)] overflow-hidden rounded-3xl bg-sand-50 p-0 text-ink shadow-[var(--shadow-lift)] backdrop:bg-date-900/60 backdrop:backdrop-blur-sm",
        wide ? "max-w-3xl" : "max-w-xl",
        className,
      )}
    >
      {open && (
        <div className="flex max-h-[92vh] flex-col">
          <div className="flex items-center justify-between border-b border-sand-200 px-6 py-4">
            <h2 className="font-display text-2xl">{title}</h2>
            <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-sand-200" aria-label="Close">
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <div className="overflow-y-auto">{children}</div>
        </div>
      )}
    </dialog>
  );
}
