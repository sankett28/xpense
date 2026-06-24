"use client";

import { useState } from "react";
import { Plane } from "lucide-react";
import { StartTripSheet } from "@/components/vacation/StartTripSheet";

// Shown at /vacation when no trip is active: a prompt + the start sheet.
export function StartTripGate() {
  const [open, setOpen] = useState(false);
  return (
    <div className="pt-8">
      <p className="label-caps">Vacation</p>
      <p className="mt-2 text-ink-dim">
        Track a trip separately from your monthly budget. Trip spending won&apos;t touch your
        monthly pace.
      </p>
      <button
        onClick={() => setOpen(true)}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-md bg-pace-good py-3 font-medium text-canvas"
      >
        <Plane size={18} /> Start a vacation
      </button>
      <StartTripSheet open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
