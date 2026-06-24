import { createClient } from "@/lib/supabase/server";
import { getActivePlan } from "@/lib/queries/plans";
import { getCycleResetDay } from "@/lib/queries/profile";
import { resolveCalendarCycle, computePace, computeCategoryPace } from "@/lib/pace";
import { todayISO } from "@/lib/utils/date";
import type { CalendarCycle, CategoryPace, PaceResult, PlanWithAllowances } from "@/lib/types";

export interface CyclePace {
  cycle: CalendarCycle;
  pace: PaceResult;
  categories: CategoryPace[];
  spentToday: number;
  spentSoFar: number;
  committed: number;
  plan: PlanWithAllowances | null;
}

export async function getCyclePace(): Promise<CyclePace | null> {
  const plan = await getActivePlan();
  const resetDay = await getCycleResetDay();
  const today = todayISO();
  const cycle = resolveCalendarCycle(resetDay, today);

  const supabase = await createClient();

  // Discretionary spend (recurring_id is null) within the cycle.
  const { data: discRows, error: dErr } = await supabase
    .from("transactions")
    .select("amount, category_id, spent_at")
    .is("recurring_id", null)
    .is("trip_id", null)
    .gte("spent_at", cycle.start)
    .lt("spent_at", cycle.end);
  if (dErr) throw dErr;

  // Committed: full monthly amount of active recurring expenses (reserved upfront).
  const { data: recRows, error: rErr } = await supabase
    .from("recurring_expenses")
    .select("amount")
    .eq("is_active", true);
  if (rErr) throw rErr;

  const spentSoFar = (discRows ?? []).reduce((s, r) => s + Number((r as { amount: number }).amount), 0);
  const committed = (recRows ?? []).reduce((s, r) => s + Number((r as { amount: number }).amount), 0);

  const today10 = today;
  const spentToday = (discRows ?? [])
    .filter((r) => String((r as { spent_at: string }).spent_at).slice(0, 10) === today10)
    .reduce((s, r) => s + Number((r as { amount: number }).amount), 0);

  const perCat: Record<string, number> = {};
  for (const r of discRows ?? []) {
    const id = (r as { category_id: string }).category_id;
    perCat[id] = (perCat[id] ?? 0) + Number((r as { amount: number }).amount);
  }

  const salary = plan ? Number(plan.salary) : 0;
  const buffer = plan ? Number(plan.buffer) : 0;
  const allocated = plan ? plan.allowances.reduce((s, a) => s + Number(a.amount), 0) : 0;

  const pace = computePace({ salary, buffer, committed, spentSoFar, cycle }, allocated);

  const categories: CategoryPace[] = plan
    ? plan.allowances.map((a) =>
        computeCategoryPace({
          categoryId: a.category_id,
          name: a.category.name,
          icon: a.category.icon,
          color: a.category.color,
          allowance: Number(a.amount),
          spent: perCat[a.category_id] ?? 0,
          cycle,
        }),
      )
    : [];

  // Categories trending over float to the top (highest paceRatio first).
  categories.sort((x, y) => y.paceRatio - x.paceRatio);

  return { cycle, pace, categories, spentToday, spentSoFar, committed, plan };
}
