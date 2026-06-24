"use client";

import { formatINR } from "@/lib/utils/currency";
import type { Plan } from "@/lib/types";

export function PlanCard({
  plan,
  active,
  savings,
  pending,
  onOpen,
  onActivate,
  onDelete,
}: {
  plan: Plan;
  active: boolean;
  savings: number;
  pending: boolean;
  onOpen: () => void;
  onActivate: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-2xl bg-panel p-4">
      <button type="button" onClick={onOpen} className="block w-full text-left">
        <div className="flex items-center justify-between">
          <span className="text-ink">{plan.name}</span>
          {active ? (
            <span className="flex items-center gap-1.5 text-xs text-pace-good">
              <span className="h-2 w-2 rounded-full bg-pace-good" /> ACTIVE
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-ink-dim tabular-nums">
          {formatINR(Number(plan.salary))} · saves {formatINR(savings)}
        </p>
      </button>

      {!active ? (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onActivate}
            disabled={pending}
            className="rounded-md bg-pace-good px-3 py-1.5 text-sm text-canvas disabled:opacity-60"
          >
            Make active
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            className="rounded-md border border-hairline px-3 py-1.5 text-sm text-ink-dim disabled:opacity-60"
          >
            Delete
          </button>
        </div>
      ) : null}
    </div>
  );
}
