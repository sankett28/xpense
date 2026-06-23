// Pure insight computation: simple, explainable aggregations only (no ML).
// Patterns only emit with enough data so we never fabricate early insights.

import type { Insight } from "@/lib/types";
import { daysBetween, formatINRish } from "./_fmt";

interface Row {
  amount: number;
  spent_at: string; // timestamp
  cycle_start: string; // YYYY-MM-DD of the row's cycle
}

function dayOfWeek(ts: string): number {
  // 0=Sun..6=Sat, local.
  return new Date(ts).getDay();
}

export function computeInsights(rows: Row[], opts?: { minRows?: number }): Insight[] {
  const minRows = opts?.minRows ?? 15;
  if (rows.length < minRows) return [];

  const insights: Insight[] = [];

  // --- Weekday pattern: weekend (Sat/Sun) daily avg vs weekday daily avg ---
  const weekendDays = new Set<string>();
  const weekdayDays = new Set<string>();
  let weekendTotal = 0;
  let weekdayTotal = 0;
  for (const r of rows) {
    const dow = dayOfWeek(r.spent_at);
    const dayKey = r.spent_at.slice(0, 10);
    if (dow === 0 || dow === 6) {
      weekendDays.add(dayKey);
      weekendTotal += r.amount;
    } else {
      weekdayDays.add(dayKey);
      weekdayTotal += r.amount;
    }
  }
  const weekendAvg = weekendDays.size ? weekendTotal / weekendDays.size : 0;
  const weekdayAvg = weekdayDays.size ? weekdayTotal / weekdayDays.size : 0;
  if (weekendAvg >= weekdayAvg * 1.25 && weekendDays.size >= 2) {
    insights.push({
      kind: "weekday",
      headline: "You overspend most on weekends",
      detail: `Sat–Sun avg ${formatINRish(weekendAvg)}/day vs ${formatINRish(weekdayAvg)} on weekdays`,
    });
  }

  // --- Week-of-cycle pattern: share of spend in days 1–7 ---
  let firstWeekTotal = 0;
  let total = 0;
  for (const r of rows) {
    total += r.amount;
    const dayIndex = daysBetween(r.cycle_start, r.spent_at.slice(0, 10)); // 0-based
    if (dayIndex >= 0 && dayIndex < 7) firstWeekTotal += r.amount;
  }
  const share = total > 0 ? firstWeekTotal / total : 0;
  if (share >= 0.35) {
    insights.push({
      kind: "week-of-cycle",
      headline: "Week 1 is your heavy week",
      detail: `${Math.round(share * 100)}% of spend lands in days 1–7`,
    });
  }

  return insights.slice(0, 3);
}

// Consecutive most-recent cycles (input ordered newest-first) where savings met goal.
export function computeStreak(
  cycleSavings: Array<{ savings: number; goal: number }>,
): number {
  let streak = 0;
  for (const c of cycleSavings) {
    if (c.savings >= c.goal) streak += 1;
    else break;
  }
  return streak;
}
