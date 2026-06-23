"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

// Bottom sheet / drawer. Slides up from the bottom with a dark backdrop.
// Closes on backdrop click and Escape. On wide screens it stays within the
// centered phone column and shows an × button; on touch / small screens you can
// drag the grab handle down to dismiss. The panel is height-capped and its body
// scrolls, so the header (and ×) is never pushed off-screen on short viewports.
export function Sheet({ open, onClose, children, title }: SheetProps) {
  // Live drag offset (px) while the user is pulling the sheet down.
  const [dragY, setDragY] = useState(0);
  const startY = useRef<number | null>(null);

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

  // --- Drag-to-dismiss (touch). Only counts downward drags. ---
  const onTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    setDragY(0); // start each drag from a clean offset
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (startY.current === null) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) setDragY(delta);
  };
  const onTouchEnd = () => {
    // Past the threshold → dismiss; otherwise snap back.
    if (dragY > 120) onClose();
    setDragY(0);
    startY.current = null;
  };

  // While dragging, follow the finger (no transition); otherwise animate.
  const dragging = dragY > 0;
  const transform = open
    ? dragging
      ? `translateY(${dragY}px)`
      : "translateY(0)"
    : "translateY(100%)";

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

      {/* Panel — pinned to the bottom, constrained to the app column and to the
          viewport height so the header stays visible and the body scrolls. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title ?? "Sheet"}
        style={{
          transform,
          transition: dragging ? "none" : undefined,
        }}
        className={[
          "absolute inset-x-0 bottom-0 mx-auto flex w-full max-w-[480px] flex-col",
          "max-h-[92dvh] bg-surface rounded-t-3xl shadow-2xl",
          dragging ? "" : "transition-transform duration-300 ease-out",
          "pb-[max(1rem,env(safe-area-inset-bottom))]",
        ].join(" ")}
      >
        {/* Grab handle — drag down to close (mobile). */}
        <div
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className="flex shrink-0 cursor-grab touch-none justify-center pt-3 pb-1 active:cursor-grabbing"
          role="button"
          aria-label="Drag down to close"
        >
          <span className="h-1.5 w-12 rounded-full bg-ink-soft/40" />
        </div>

        {/* Header — sticky within the flex column; never scrolls away. */}
        <div className="flex shrink-0 items-center justify-between px-5 pt-2 pb-2">
          {title ? (
            <h2 className="font-display text-xl text-ink">{title}</h2>
          ) : (
            <span />
          )}
          {/* × on pointer/desktop; on touch the grab handle is the affordance. */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="hidden h-9 w-9 place-items-center rounded-full text-ink-soft hover:bg-surface-2 sm:grid"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body — the only scrollable region. */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-2">
          {children}
        </div>
      </div>
    </div>
  );
}

export default Sheet;
