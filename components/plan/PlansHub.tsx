"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plane } from "lucide-react";
import { PlanCard } from "@/components/plan/PlanCard";
import {
  activatePlanAction,
  deletePlanAction,
  duplicatePlanAction,
} from "@/app/(app)/actions";
import type { Plan, PlanWithAllowances, Trip } from "@/lib/types";

function savingsOf(plan: Plan, allowancesTotal: number): number {
  return Number(plan.salary) - allowancesTotal - Number(plan.buffer);
}

export function PlansHub({
  plans,
  activePlan,
  allowanceTotals,
  activeTrip,
}: {
  plans: Plan[];
  activePlan: PlanWithAllowances | null;
  // plan id -> sum of its allowances (computed server-side)
  allowanceTotals: Record<string, number>;
  activeTrip: Trip | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<unknown>) {
    setError(null);
    start(async () => {
      try {
        await fn();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  return (
    <div className="pt-6">
      <p className="label-caps">Plans</p>

      <div className="mt-3 space-y-3">
        {plans.map((p) => (
          <PlanCard
            key={p.id}
            plan={p}
            active={p.id === activePlan?.id}
            savings={savingsOf(p, allowanceTotals[p.id] ?? 0)}
            pending={pending}
            onOpen={() => router.push(`/plan/${p.id}`)}
            onActivate={() => run(() => activatePlanAction(p.id))}
            onDelete={() => {
              if (confirm(`Delete "${p.name}"?`)) run(() => deletePlanAction(p.id));
            }}
          />
        ))}
      </div>

      {error ? <p className="mt-3 text-sm text-pace-over">{error}</p> : null}

      <div className="mt-4 flex gap-3">
        <button
          type="button"
          onClick={() => router.push("/plan/new")}
          className="flex-1 rounded-md bg-pace-good py-3 font-medium text-canvas"
        >
          + New plan
        </button>
        <button
          type="button"
          disabled={pending || !activePlan}
          onClick={() =>
            activePlan &&
            run(async () => {
              const { id } = await duplicatePlanAction(activePlan.id);
              router.push(`/plan/${id}`);
            })
          }
          className="rounded-md border border-hairline px-4 py-3 text-ink disabled:opacity-60"
        >
          Duplicate
        </button>
      </div>

      <button
        type="button"
        onClick={() => router.push("/vacation")}
        className="mt-8 flex w-full items-center gap-3 rounded-2xl border border-hairline bg-panel p-4 text-left"
      >
        <Plane size={20} className="text-pace-good" />
        <span>
          <span className="block text-ink">
            {activeTrip ? "Trip in progress" : "Start a vacation"}
          </span>
          <span className="block text-sm text-ink-dim">
            {activeTrip ? activeTrip.name : "Track a trip separately"}
          </span>
        </span>
      </button>
    </div>
  );
}
