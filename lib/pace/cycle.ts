// Pure calendar-cycle math. A cycle is anchored to a monthly reset day (1..31),
// clamped to the actual length of each month. Half-open [start, end): `end` is
// the first day of the NEXT cycle. No Supabase, no implicit "now" — `today` is
// always passed in so this is fully testable.

import type { CalendarCycle, EffectiveCycle } from "@/lib/types";
import { addDays, daysBetween } from "@/lib/utils/date";

function lastDayOfMonth(year: number, monthIndex0: number): number {
  // monthIndex0: 0=Jan. Day 0 of next month = last day of this month.
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

// The reset date for a given year/month, clamped to that month's length.
function resetDateFor(year: number, monthIndex0: number, resetDay: number): string {
  const day = Math.min(resetDay, lastDayOfMonth(year, monthIndex0));
  const m = String(monthIndex0 + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

export function resolveCalendarCycle(resetDay: number, today: string): CalendarCycle {
  const [ty, tm] = today.split("-").map(Number);
  const year = ty;
  const monthIndex0 = (tm ?? 1) - 1;

  const thisMonthReset = resetDateFor(year, monthIndex0, resetDay);

  let start: string;
  let end: string;
  if (today >= thisMonthReset) {
    // Cycle started this month; ends at next month's reset.
    start = thisMonthReset;
    const next = new Date(year, monthIndex0 + 1, 1);
    end = resetDateFor(next.getFullYear(), next.getMonth(), resetDay);
  } else {
    // Cycle started last month; ends at this month's reset.
    const prev = new Date(year, monthIndex0 - 1, 1);
    start = resetDateFor(prev.getFullYear(), prev.getMonth(), resetDay);
    end = thisMonthReset;
  }

  const daysInCycle = daysBetween(start, end); // exclusive end => count of days
  const elapsedRaw = daysBetween(start, today) + 1; // today counts
  const daysElapsed = Math.min(Math.max(elapsedRaw, 1), daysInCycle);
  const daysRemaining = Math.max(daysInCycle - daysElapsed, 0);

  return { start, end, daysInCycle, daysElapsed, daysRemaining };
}

// A salary that lands within this many days of the reset day is treated as
// "came early for the upcoming payday" — its expected end skips to next month
// rather than collapsing into a near-zero-length cycle.
const MIN_CYCLE_DAYS = 10;

// The expected next payday after `start`: the first reset-day date strictly
// after `start`, skipping any that fall within MIN_CYCLE_DAYS (an early salary).
function nextExpectedPayday(start: string, resetDay: number): string {
  const [y, m] = start.split("-").map(Number);
  let year = y;
  let month0 = (m ?? 1) - 1;
  for (let i = 0; i < 24; i++) {
    const candidate = resetDateFor(year, month0, resetDay);
    if (candidate > start && daysBetween(start, candidate) >= MIN_CYCLE_DAYS) {
      return candidate;
    }
    month0 += 1;
    if (month0 > 11) {
      month0 = 0;
      year += 1;
    }
  }
  return addDays(start, 30); // unreachable in practice
}

// Re-anchor a calendar cycle to the actual salary credit date. When no salary
// has been logged yet (`salaryStart` null), falls back to the plain calendar
// cycle so brand-new users still see something. Otherwise the cycle starts on
// the real credit date and its expected length runs to the next expected payday
// (the reset day), which stays fixed even when salary is overdue.
export function resolveEffectiveCycle(
  salaryStart: string | null,
  resetDay: number,
  today: string,
): EffectiveCycle {
  if (salaryStart === null) {
    const c = resolveCalendarCycle(resetDay, today);
    return { ...c, expectedEnd: c.end, overdue: false };
  }

  const start = salaryStart;
  const expectedEnd = nextExpectedPayday(start, resetDay);
  const overdue = today > expectedEnd;
  // Query window: extend through today when overdue so overdue-period spend
  // still counts toward this cycle.
  const end = overdue ? addDays(today, 1) : expectedEnd;

  const daysInCycle = daysBetween(start, expectedEnd);
  const elapsedRaw = daysBetween(start, today) + 1;
  const daysElapsed = Math.min(Math.max(elapsedRaw, 1), daysInCycle);
  const daysRemaining = Math.max(daysInCycle - daysElapsed, 0);

  return { start, end, daysInCycle, daysElapsed, daysRemaining, expectedEnd, overdue };
}
