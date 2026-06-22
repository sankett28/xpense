// THE SINGLE SOURCE OF TRUTH for budget-cycle resolution.
//
// A "cycle" is anchored by a salary credit. Each salary credit starts a cycle
// that runs until the day before the next salary credit. The most recent salary
// has no following salary, so its cycle is OPEN (cycle_end = null) and runs
// through today.
//
// A date belongs to the cycle where:
//     cycle_start <= date <= coalesce(cycle_end, today)
//
// This module is pure: it takes already-fetched BudgetCycleRow[] and never
// imports Supabase. Callers (lib/queries/cycles.ts) fetch the rows.

import type { BudgetCycleRow, ResolvedCycle } from "@/lib/types";
import { daysBetween, todayISO } from "@/lib/utils/date";

// Defensive ascending sort by cycle_start (the view should already do this, but
// we never rely on input ordering).
function sortRows(rows: BudgetCycleRow[]): BudgetCycleRow[] {
  return [...rows].sort((a, b) => (a.cycle_start < b.cycle_start ? -1 : a.cycle_start > b.cycle_start ? 1 : 0));
}

// Coalesce a row's end to `today` (the open cycle has cycle_end === null).
function endOf(row: BudgetCycleRow, today: string): string {
  return row.cycle_end ?? today;
}

// Build a ResolvedCycle from a row, computing the 1-based dayNumber relative to
// today (clamped to >= 1).
function resolve(row: BudgetCycleRow, today: string): ResolvedCycle {
  const end = endOf(row, today);
  // dayNumber = days from start to today + 1 (1-based). For past cycles we still
  // count to today's relationship with the start; callers generally only ask for
  // dayNumber on the current cycle, but we keep it consistent and >= 1.
  const dayNumber = Math.max(1, daysBetween(row.cycle_start, today) + 1);
  return {
    salaryCreditId: row.salary_credit_id,
    salaryAmount: Number(row.salary_amount),
    start: row.cycle_start,
    end,
    isOpen: row.cycle_end === null,
    dayNumber,
  };
}

// The current cycle is the one containing `today`. The open cycle (cycle_end
// null) runs through today and is current once today >= its start. Returns null
// if no salary cycle exists yet.
export function resolveCurrentCycle(
  rows: BudgetCycleRow[],
  today: string = todayISO(),
): ResolvedCycle | null {
  if (!rows || rows.length === 0) return null;
  const sorted = sortRows(rows);

  for (const row of sorted) {
    if (row.cycle_start <= today && today <= endOf(row, today)) {
      return resolve(row, today);
    }
  }

  // No cycle contains today. This happens when today is BEFORE the first salary
  // (no cycle has started yet) → no current cycle.
  return null;
}

// Resolve which cycle a given YYYY-MM-DD date falls into. Uses `today` only to
// coalesce the open cycle's end. Returns null if the date precedes all cycles.
export function resolveCycleForDate(
  rows: BudgetCycleRow[],
  date: string,
  today: string = todayISO(),
): ResolvedCycle | null {
  if (!rows || rows.length === 0) return null;
  const sorted = sortRows(rows);

  for (const row of sorted) {
    if (row.cycle_start <= date && date <= endOf(row, today)) {
      return resolve(row, today);
    }
  }
  return null;
}
