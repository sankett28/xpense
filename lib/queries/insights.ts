import { createClient } from "@/lib/supabase/server";
import { getActivePlan } from "@/lib/queries/plans";
import { getCycleResetDay } from "@/lib/queries/profile";
import { resolveCalendarCycle, computeInsights, computeStreak } from "@/lib/pace";
import { todayISO, toISODate } from "@/lib/utils/date";
import type { Insight, CalendarCycle } from "@/lib/types";

export interface InsightsResult {
  insights: Insight[];
  savedThisCycle: number;
  savedLastCycle: number | null;
  streak: number;
}

// Compute the previous cycle's [start,end) by walking the reset day back one step.
function previousCycle(resetDay: number, current: CalendarCycle): CalendarCycle {
  const dayBeforeStart = new Date(current.start);
  dayBeforeStart.setDate(dayBeforeStart.getDate() - 1);
  return resolveCalendarCycle(resetDay, toISODate(dayBeforeStart));
}

export async function getInsights(): Promise<InsightsResult> {
  const plan = await getActivePlan();
  const resetDay = await getCycleResetDay();
  const cycle = resolveCalendarCycle(resetDay, todayISO());
  const prev = previousCycle(resetDay, cycle);

  const supabase = await createClient();

  // Pull recent transactions (this + previous cycle window) for patterns.
  const { data: rows, error } = await supabase
    .from("transactions")
    .select("amount, spent_at, recurring_id")
    .gte("spent_at", prev.start)
    .lt("spent_at", cycle.end);
  if (error) throw error;

  const salary = plan ? Number(plan.salary) : 0;
  const buffer = plan ? Number(plan.buffer) : 0;
  const allocated = plan ? plan.allowances.reduce((s, a) => s + Number(a.amount), 0) : 0;
  const goal = salary - allocated - buffer;

  const inWindow = (start: string, end: string) =>
    (rows ?? []).filter((r) => {
      const d = String((r as { spent_at: string }).spent_at).slice(0, 10);
      return d >= start && d < end;
    });

  const thisSpend = inWindow(cycle.start, cycle.end).reduce(
    (s, r) => s + Number((r as { amount: number }).amount),
    0,
  );
  const prevSpend = inWindow(prev.start, prev.end).reduce(
    (s, r) => s + Number((r as { amount: number }).amount),
    0,
  );

  const savedThisCycle = salary - thisSpend;
  const savedLastCycle = plan ? salary - prevSpend : null;

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
