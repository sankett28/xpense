"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/ui/Sheet";
import { DateField } from "@/components/ui/DateField";
import { startTripAction } from "@/app/(app)/actions";

export function StartTripSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function go() {
    if (!name.trim()) {
      setError("Name your trip");
      return;
    }
    setError(null);
    start(async () => {
      try {
        await startTripAction({ name, startDate, endDate });
        router.refresh();
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not start trip");
      }
    });
  }

  return (
    <Sheet open={open} onClose={onClose} title="Start a vacation">
      <div className="space-y-4 pb-2">
        <label className="block">
          <span className="label-caps">Trip name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Goa trip"
            aria-label="Trip name"
            className="mt-1.5 w-full rounded-xl bg-surface-2 px-4 py-3 text-ink outline-none focus:ring-2 focus:ring-pace-good/40"
          />
        </label>
        <div className="grid grid-cols-2 items-end gap-3">
          <div className="flex min-w-0 flex-col">
            <span className="label-caps whitespace-nowrap">Starts (optional)</span>
            <DateField value={startDate} onChange={setStartDate} ariaLabel="Trip start date" />
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="label-caps whitespace-nowrap">Ends (optional)</span>
            <DateField value={endDate} onChange={setEndDate} placeholder="Open" ariaLabel="Trip end date" />
          </div>
        </div>
        {error ? <p className="text-sm text-pace-over">{error}</p> : null}
        <button
          onClick={go}
          disabled={pending}
          className="w-full rounded-xl bg-pace-good py-3 font-medium text-canvas disabled:opacity-60"
        >
          {pending ? "Starting…" : "Start trip"}
        </button>
      </div>
    </Sheet>
  );
}
