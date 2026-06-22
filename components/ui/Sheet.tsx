"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

// Bottom sheet / drawer. Slides up from the bottom with a dark backdrop.
// Closes on backdrop click and Escape. On wide screens it stays within the
// centered phone column. Reusable for the quick-log fast-entry flow.
export function Sheet({ open, onClose, children, title }: SheetProps) {
  // Close on Escape + lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  return (
    <div
      aria-hidden={!open}
      className={[
        "fixed inset-0 z-50",
        open ? "pointer-events-auto" : "pointer-events-none",
      ].join(" ")}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={[
          "absolute inset-0 bg-dark/50 transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0",
        ].join(" ")}
      />

      {/* Panel — pinned to the bottom, constrained to the app column. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title ?? "Sheet"}
        className={[
          "absolute inset-x-0 bottom-0 mx-auto w-full max-w-[480px]",
          "bg-surface rounded-t-3xl shadow-2xl",
          "transition-transform duration-300 ease-out",
          "pb-[max(1rem,env(safe-area-inset-bottom))]",
          open ? "translate-y-0" : "translate-y-full",
        ].join(" ")}
      >
        {/* Grab handle */}
        <div className="flex justify-center pt-3">
          <span className="h-1.5 w-10 rounded-full bg-ink-soft/30" />
        </div>

        {(title || true) && (
          <div className="flex items-center justify-between px-5 pt-3 pb-2">
            {title ? (
              <h2 className="font-display text-xl text-ink">{title}</h2>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid h-9 w-9 place-items-center rounded-full text-ink-soft hover:bg-surface-2"
            >
              <X size={18} />
            </button>
          </div>
        )}

        <div className="px-5 pb-2">{children}</div>
      </div>
    </div>
  );
}

export default Sheet;
