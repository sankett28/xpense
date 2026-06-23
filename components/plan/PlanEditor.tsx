"use client";

import { useMemo, useState, useTransition } from "react";
import { AllowanceRow } from "@/components/plan/AllowanceRow";
import { formatINR } from "@/lib/utils/currency";
import { paceHue } from "@/lib/utils/paceHue";
import { savePlanAction, activatePlanAction, setCycleResetDayAction } from "@/app/(app)/actions";
import type { Category, Plan, PlanWithAllowances } from "@/lib/types";

type AllowanceState = Record<string, number>; // categoryId -> amount

export function PlanEditor({
  activePlan,
  plans,
  categories,
  resetDay,
}: {
  activePlan: PlanWithAllowances | null;
  plans: Plan[];
  categories: Category[];
  resetDay: number;
}) {
  const [name, setName] = useState(activePlan?.name ?? "Monthly plan");
  const [salary, setSalary] = useState(activePlan ? Number(activePlan.salary) : 0);
  const [buffer, setBuffer] = useState(activePlan ? Number(activePlan.buffer) : 0);
  const [day, setDay] = useState(resetDay);
  const [allowances, setAllowances] = useState<AllowanceState>(() => {
    const init: AllowanceState = {};
    for (const c of categories) init[c.id] = 0;
    for (const a of activePlan?.allowances ?? []) init[a.category_id] = Number(a.amount);
    return init;
  });
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const allocated = useMemo(
    () => Object.values(allowances).reduce((s, n) => s + (n || 0), 0),
    [allowances],
  );
  const savings = salary - allocated - buffer;
  const over = savings < 0;

  function setAmount(categoryId: string, next: number) {
    setAllowances((prev) => ({ ...prev, [categoryId]: next }));
  }

  function save(makeNew: boolean) {
    setError(null);
    start(async () => {
      try {
        if (day !== resetDay) await setCycleResetDayAction(day);
        await savePlanAction({
          id: makeNew ? null : (activePlan?.id ?? null),
          name: makeNew ? `${name} copy` : name,
          salary,
          buffer,
          makeActive: true,
          allowances: categories.map((c) => ({ categoryId: c.id, amount: allowances[c.id] ?? 0 })),
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save");
      }
    });
  }

  return (
    <div className="pt-6">
      <p className="label-caps">Your active plan</p>

      {plans.length > 1 ? (
        <select
          value={activePlan?.id ?? ""}
          onChange={(e) => start(() => activatePlanAction(e.target.value))}
          className="mt-2 bg-panel text-ink rounded-md px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-pace-good"
          aria-label="Switch active plan"
        >
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      ) : null}

      <label className="mt-4 block">
        <span className="label-caps">Plan name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full bg-panel text-ink rounded-md px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-pace-good"
        />
      </label>

      <label className="mt-4 flex items-center justify-between">
        <span className="label-caps">Monthly salary</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={salary === 0 ? "" : salary}
          placeholder="0"
          onChange={(e) => setSalary(Number(e.target.value) || 0)}
          className="w-32 bg-panel text-ink tabular-nums text-right rounded-md px-2 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-pace-good"
          aria-label="Monthly salary"
        />
      </label>

      <label className="mt-4 flex items-center justify-between">
        <span className="label-caps">Cycle resets on day</span>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={31}
          value={day}
          onChange={(e) => setDay(Math.min(31, Math.max(1, Number(e.target.value) || 1)))}
          className="w-20 bg-panel text-ink tabular-nums text-right rounded-md px-2 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-pace-good"
          aria-label="Cycle reset day of month"
        />
      </label>

      <p className="label-caps mt-8">Allowances</p>
      <div>
        {categories.map((c) => (
          <AllowanceRow
            key={c.id}
            name={c.name}
            amount={allowances[c.id] ?? 0}
            onChange={(n) => setAmount(c.id, n)}
          />
        ))}
      </div>

      <label className="mt-4 flex items-center justify-between">
        <span className="label-caps">Buffer (optional)</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={buffer === 0 ? "" : buffer}
          placeholder="0"
          onChange={(e) => setBuffer(Number(e.target.value) || 0)}
          className="w-32 bg-panel text-ink tabular-nums text-right rounded-md px-2 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-pace-good"
          aria-label="Buffer"
        />
      </label>

      <div className="mt-6 border-t border-hairline pt-4 flex items-center justify-between">
        <span className="label-caps">Allocated</span>
        <span className="tabular-nums text-ink">{formatINR(allocated)}</span>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="label-caps">{over ? "Over by" : "Savings goal"}</span>
        <span
          className="tabular-nums text-2xl font-light"
          style={{ color: over ? paceHue(1.4) : "var(--color-ink)" }}
        >
          {formatINR(Math.abs(savings))}
        </span>
      </div>

      {error ? <p className="mt-3 text-sm" style={{ color: paceHue(1.4) }}>{error}</p> : null}

      <div className="mt-6 flex gap-3">
        <button
          onClick={() => save(false)}
          disabled={pending}
          className="flex-1 rounded-md bg-pace-good text-canvas font-medium py-3 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save plan"}
        </button>
        <button
          onClick={() => save(true)}
          disabled={pending}
          className="rounded-md border border-hairline text-ink py-3 px-4 disabled:opacity-60"
        >
          Save as new
        </button>
      </div>
    </div>
  );
}
