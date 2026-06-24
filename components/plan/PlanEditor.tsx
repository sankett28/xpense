"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { formatINR } from "@/lib/utils/currency";
import { paceHue, dotPercent } from "@/lib/utils/paceHue";
import {
  savePlanAction,
  setCycleResetDayAction,
  createCategoryAction,
} from "@/app/(app)/actions";
import type { Category, PlanWithAllowances } from "@/lib/types";

type AllowanceState = Record<string, number>; // categoryId -> amount

export function PlanEditor({
  plan,
  categories,
  resetDay,
}: {
  plan: PlanWithAllowances | null;
  categories: Category[];
  resetDay: number;
}) {
  const router = useRouter();
  const isNew = !plan;

  const [name, setName] = useState(plan?.name ?? "Monthly plan");
  const [salary, setSalary] = useState(plan ? Number(plan.salary) : 0);
  const [buffer, setBuffer] = useState(plan ? Number(plan.buffer) : 0);
  const [day, setDay] = useState(resetDay);
  // Rows currently in this plan (id, name). Starts from the plan's allowances,
  // or all categories for a brand-new plan.
  const [rows, setRows] = useState<Array<{ id: string; name: string }>>(() => {
    if (plan) {
      return plan.allowances.map((a) => ({ id: a.category_id, name: a.category.name }));
    }
    return categories.map((c) => ({ id: c.id, name: c.name }));
  });
  const [allowances, setAllowances] = useState<AllowanceState>(() => {
    const init: AllowanceState = {};
    if (plan) for (const a of plan.allowances) init[a.category_id] = Number(a.amount);
    else for (const c of categories) init[c.id] = 0;
    return init;
  });
  const [newCategory, setNewCategory] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const allocated = useMemo(
    () => rows.reduce((s, r) => s + (allowances[r.id] || 0), 0),
    [rows, allowances],
  );
  const savings = salary - allocated - buffer;
  const over = savings < 0;
  // Savings-fill ratio for the bar: 0 when nothing saved, ~1 at full salary.
  const fillRatio = salary > 0 ? Math.max(0, Math.min(1, savings / salary)) : 0;

  function setAmount(id: string, next: number) {
    setAllowances((prev) => ({ ...prev, [id]: next }));
  }
  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
    setAllowances((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }
  function addCategory() {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    setError(null);
    start(async () => {
      try {
        const created = await createCategoryAction({ name: trimmed });
        setRows((prev) => [...prev, { id: created.id, name: created.name }]);
        setAllowances((prev) => ({ ...prev, [created.id]: 0 }));
        setNewCategory("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not add category");
      }
    });
  }
  function save() {
    setError(null);
    start(async () => {
      try {
        if (day !== resetDay) await setCycleResetDayAction(day);
        await savePlanAction({
          id: plan?.id ?? null,
          name,
          salary,
          buffer,
          makeActive: true,
          allowances: rows.map((r) => ({ categoryId: r.id, amount: allowances[r.id] ?? 0 })),
        });
        router.push("/plan");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save");
      }
    });
  }

  const inputCls =
    "bg-panel text-ink tabular-nums text-right rounded-md px-2 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-pace-good";

  return (
    <div className="pt-6">
      <button
        type="button"
        onClick={() => router.push("/plan")}
        className="text-sm text-ink-dim"
      >
        ‹ Plans
      </button>

      <p className="label-caps mt-3">{isNew ? "New plan" : "Edit plan"}</p>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        aria-label="Plan name"
        className="mt-1 w-full bg-panel text-ink rounded-md px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-pace-good"
      />

      <p className="label-caps mt-8">Income</p>
      <label className="mt-2 flex items-center justify-between">
        <span className="text-ink">Monthly salary</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={salary === 0 ? "" : salary}
          placeholder="0"
          onChange={(e) => setSalary(Number(e.target.value) || 0)}
          aria-label="Monthly salary"
          className={`w-32 ${inputCls}`}
        />
      </label>
      <label className="mt-3 flex items-center justify-between">
        <span className="text-ink">Cycle resets on day</span>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={31}
          value={day}
          onChange={(e) => setDay(Math.min(31, Math.max(1, Number(e.target.value) || 1)))}
          aria-label="Cycle reset day of month"
          className={`w-20 ${inputCls}`}
        />
      </label>

      <p className="label-caps mt-8">Allowances</p>
      <div>
        {rows.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between gap-3 border-b border-hairline py-3"
          >
            <span className="min-w-0 flex-1 truncate text-ink">{r.name}</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={(allowances[r.id] ?? 0) === 0 ? "" : allowances[r.id]}
              placeholder="0"
              onChange={(e) => setAmount(r.id, Number(e.target.value) || 0)}
              aria-label={`Allowance for ${r.name}`}
              className={`w-28 ${inputCls}`}
            />
            <button
              type="button"
              onClick={() => removeRow(r.id)}
              aria-label={`Remove ${r.name}`}
              className="grid h-8 w-8 place-items-center rounded-full text-ink-dim hover:bg-surface-2"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <input
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCategory();
            }
          }}
          placeholder="Add category"
          aria-label="New category name"
          className="flex-1 bg-panel text-ink rounded-md px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-pace-good"
        />
        <button
          type="button"
          onClick={addCategory}
          disabled={pending || !newCategory.trim()}
          className="rounded-md border border-hairline px-4 py-2 text-ink disabled:opacity-50"
        >
          Add
        </button>
      </div>

      <label className="mt-6 flex items-center justify-between">
        <span className="text-ink">Buffer (optional)</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={buffer === 0 ? "" : buffer}
          placeholder="0"
          onChange={(e) => setBuffer(Number(e.target.value) || 0)}
          aria-label="Buffer"
          className={`w-32 ${inputCls}`}
        />
      </label>

      <p className="label-caps mt-8">Savings</p>
      <div className="mt-2 space-y-1 text-sm">
        <Row label="Salary" value={formatINR(salary)} />
        <Row label="− Allowances" value={formatINR(allocated)} />
        <Row label="− Buffer" value={formatINR(buffer)} />
      </div>
      <div className="mt-2 border-t border-hairline pt-3 flex items-center justify-between">
        <span className="text-ink">{over ? "You're over by" : "You'll save"}</span>
        <span
          className="tabular-nums text-2xl font-light"
          style={{ color: over ? paceHue(1.4) : paceHue(0) }}
        >
          {formatINR(Math.abs(savings))}
        </span>
      </div>
      {/* Glide-style savings bar. */}
      <div className="glide-track mt-3" style={{ ["--pace-hue" as string]: over ? paceHue(1.4) : paceHue(0) }}>
        <span
          className="glide-dot"
          style={{ left: `${over ? 8 : dotPercent(fillRatio * 2)}%` }}
          aria-hidden
        />
      </div>

      {error ? <p className="mt-3 text-sm" style={{ color: paceHue(1.4) }}>{error}</p> : null}

      <button
        onClick={save}
        disabled={pending}
        className="mt-6 w-full rounded-md bg-pace-good py-3 font-medium text-canvas disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save plan"}
      </button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-dim">{label}</span>
      <span className="tabular-nums text-ink">{value}</span>
    </div>
  );
}
