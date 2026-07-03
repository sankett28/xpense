import { createClient } from "@/lib/supabase/server";
import { getActivePlan } from "@/lib/queries/plans";
import { getCycleResetDay } from "@/lib/queries/profile";
import { getBudgetCycleRows } from "@/lib/queries/cycles";
import { resolveCurrentCycle, previousSalaryWindow } from "@/lib/utils/cycle";
import { resolveEffectiveCycle, computeInsights, computeStreak } from "@/lib/pace";
import { todayISO } from "@/lib/utils/date";
import type { Insight } from "@/lib/types";

export interface InsightsResult {
  insights: Insight[];
  savedThisCycle: number;
  savedLastCycle: number | null;
  streak: number;
}

export async function getInsights(): Promise<InsightsResult> {
  const plan = await getActivePlan();
  const resetDay = await getCycleResetDay();
  const today = todayISO();

  const rows = await getBudgetCycleRows();
  const salaryCycle = resolveCurrentCycle(rows, today);
  const cycle = resolveEffectiveCycle(salaryCycle?.start ?? null, resetDay, today);
  const prev = previousSalaryWindow(rows, salaryCycle);

  const supabase = await createClient();

  // Pull recent transactions (this + previous cycle window) for patterns.
  const windowStart = prev?.start ?? cycle.start;
  const { data: rows_tx, error } = await supabase
    .from("transactions")
    .select("amount, spent_at, recurring_id")
    .is("trip_id", null)
    .gte("spent_at", windowStart)
    .lt("spent_at", cycle.end);
  if (error) throw error;

  // Committed: full monthly amount of active recurring expenses (reserved upfront).
  const { data: recRows, error: rErr } = await supabase
    .from("recurring_expenses")
    .select("amount")
    .eq("is_active", true);
  if (rErr) throw rErr;
  const committed = (recRows ?? []).reduce((s, r) => s + Number((r as { amount: number }).amount), 0);

  const salary = plan ? Number(plan.salary) : 0;
  const buffer = plan ? Number(plan.buffer) : 0;
  const allocated = plan ? plan.allowances.reduce((s, a) => s + Number(a.amount), 0) : 0;
  const goal = salary - allocated - buffer;

  // Only discretionary rows (recurring_id IS NULL) count against saved totals.
  const inWindow = (start: string, end: string) =>
    (rows_tx ?? []).filter((r) => {
      const d = String((r as { spent_at: string }).spent_at).slice(0, 10);
      return d >= start && d < end && (r as { recurring_id: string | null }).recurring_id == null;
    });

  const thisSpend = inWindow(cycle.start, cycle.end).reduce(
    (s, r) => s + Number((r as { amount: number }).amount),
    0,
  );
  const prevSpend = prev
    ? inWindow(prev.start, prev.end).reduce(
        (s, r) => s + Number((r as { amount: number }).amount),
        0,
      )
    : 0;

  const savedThisCycle = salary - thisSpend - committed - buffer;
  const savedLastCycle = plan && prev ? salary - prevSpend - committed - buffer : null;

  // Patterns over the current cycle's rows, tagged with cycle_start.
  const patternRows = inWindow(cycle.start, cycle.end).map((r) => ({
    amount: Number((r as { amount: number }).amount),
    spent_at: String((r as { spent_at: string }).spent_at),
    cycle_start: cycle.start,
  }));
  const insights = computeInsights(patternRows);

  const streakInput = [
    { savings: savedThisCycle, goal },
    ...(savedLastCycle != null ? [{ savings: savedLastCycle, goal }] : []),
  ];
  const streak = computeStreak(streakInput);

  return { insights, savedThisCycle, savedLastCycle, streak };
}
