import { createClient } from "@/lib/supabase/server";
import { AVAILABLE_FROM_SALARY_ONLY } from "@/lib/config";
import type { BudgetCycleRow, ResolvedCycle } from "@/lib/types";
import { resolveCurrentCycle } from "@/lib/utils/cycle";
import { addDays } from "@/lib/utils/date";

export interface CycleTotals {
  totalCredited: number;
  totalSpent: number;
  available: number;
}

// Raw rows from the budget_cycles view, ascending by cycle_start.
export async function getBudgetCycleRows(): Promise<BudgetCycleRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("budget_cycles")
    .select("*")
    .order("cycle_start", { ascending: true });

  if (error) throw error;
  return (data ?? []) as BudgetCycleRow[];
}

// Convenience: fetch rows and resolve the current cycle in one call.
export async function getCurrentCycle(): Promise<ResolvedCycle | null> {
  const rows = await getBudgetCycleRows();
  return resolveCurrentCycle(rows);
}

// Aggregate credited/spent/available for a resolved cycle.
//   totalCredited = sum of ALL credits with credited_at in [start, end]
//   totalSpent    = sum of transactions with spent_at::date in [start, end]
//   available     = (salary-only ? salaryAmount : totalCredited) - totalSpent
export async function getCycleTotals(
  cycle: ResolvedCycle,
): Promise<CycleTotals> {
  const supabase = await createClient();

  // credited_at is a DATE column: inclusive [start, end] is a simple range.
  const creditsPromise = supabase
    .from("credits")
    .select("amount")
    .gte("credited_at", cycle.start)
    .lte("credited_at", cycle.end);

  // spent_at is timestamptz; compare against the date range. Use a half-open
  // upper bound (< end + 1 day) so the entire end day is included regardless of
  // time-of-day. Lower bound is the start at local midnight.
  const exclusiveEnd = addDays(cycle.end, 1);
  const txPromise = supabase
    .from("transactions")
    .select("amount")
    .gte("spent_at", cycle.start)
    .lt("spent_at", exclusiveEnd);

  const [{ data: credits, error: cErr }, { data: txs, error: tErr }] =
    await Promise.all([creditsPromise, txPromise]);

  if (cErr) throw cErr;
  if (tErr) throw tErr;

  const totalCredited = sumAmounts(credits);
  const totalSpent = sumAmounts(txs);
  const base = AVAILABLE_FROM_SALARY_ONLY ? cycle.salaryAmount : totalCredited;

  return {
    totalCredited,
    totalSpent,
    available: base - totalSpent,
  };
}

// Spend per category within a resolved cycle, as a { category_id: total } map.
// Used by the soft-budget bars on the Categories screen.
export async function getSpendByCategory(
  cycle: ResolvedCycle,
): Promise<Record<string, number>> {
  const supabase = await createClient();
  const exclusiveEnd = addDays(cycle.end, 1);

  const { data, error } = await supabase
    .from("transactions")
    .select("category_id, amount")
    .gte("spent_at", cycle.start)
    .lt("spent_at", exclusiveEnd);

  if (error) throw error;

  const byCategory: Record<string, number> = {};
  for (const row of data ?? []) {
    const id = (row as { category_id: string }).category_id;
    byCategory[id] = (byCategory[id] ?? 0) + Number((row as { amount: number }).amount);
  }
  return byCategory;
}

function sumAmounts(rows: { amount: number }[] | null): number {
  if (!rows) return 0;
  return rows.reduce((acc, r) => acc + Number(r.amount), 0);
}
