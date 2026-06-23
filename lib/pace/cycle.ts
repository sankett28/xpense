// Pure calendar-cycle math. A cycle is anchored to a monthly reset day (1..31),
// clamped to the actual length of each month. Half-open [start, end): `end` is
// the first day of the NEXT cycle. No Supabase, no implicit "now" — `today` is
// always passed in so this is fully testable.

import type { CalendarCycle } from "@/lib/types";
import { daysBetween } from "@/lib/utils/date";

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
