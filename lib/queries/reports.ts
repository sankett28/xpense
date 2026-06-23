import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/utils/date";

export type ReportRange = "week" | "month" | "quarter";

export interface RangeBounds {
  start: string; // YYYY-MM-DD inclusive
  end: string; // YYYY-MM-DD inclusive (today)
}

export interface CategorySpend {
  categoryId: string;
  total: number;
}

export interface RangeReport {
  range: ReportRange;
  bounds: RangeBounds;
  totalSpent: number;
  count: number;
  dailyAverage: number;
  byCategory: CategorySpend[]; // descending by total
}

// Inclusive bounds ending today for each range (rolling windows).
export function rangeBounds(range: ReportRange, today = todayISO()): RangeBounds {
  const days = range === "week" ? 7 : range === "month" ? 30 : 90;
  const start = addDays(today, -(days - 1));
  return { start, end: today };
}

// Aggregate spend over a rolling range: total, count, daily average, and a
// per-category breakdown (descending). Backs the Reports screen.
export async function getRangeReport(range: ReportRange): Promise<RangeReport> {
  const supabase = await createClient();
  const bounds = rangeBounds(range);
  const exclusiveEnd = addDays(bounds.end, 1);

  const { data, error } = await supabase
    .from("transactions")
    .select("category_id, amount")
    .gte("spent_at", bounds.start)
    .lt("spent_at", exclusiveEnd);

  if (error) throw error;

  const rows = (data ?? []) as { category_id: string; amount: number }[];

  let totalSpent = 0;
  const byCat: Record<string, number> = {};
  for (const r of rows) {
    const amt = Number(r.amount);
    totalSpent += amt;
    byCat[r.category_id] = (byCat[r.category_id] ?? 0) + amt;
  }

  const days = range === "week" ? 7 : range === "month" ? 30 : 90;
  const byCategory: CategorySpend[] = Object.entries(byCat)
    .map(([categoryId, total]) => ({ categoryId, total }))
    .sort((a, b) => b.total - a.total);

  return {
    range,
    bounds,
    totalSpent,
    count: rows.length,
    dailyAverage: totalSpent / days,
    byCategory,
  };
}

export interface PeriodComparison {
  current: number; // total spent, current period
  previous: number; // total spent, the immediately-preceding equal-length period
  delta: number; // current - previous
  deltaPct: number | null; // null when previous is 0 (no baseline)
}

// Compare the current rolling range to the immediately-preceding equal-length
// window — the most behavior-changing report ("you spent ₹X more than last
// period"). Returns the overall delta plus a per-category breakdown.
export async function getRangeComparison(range: ReportRange): Promise<{
  total: PeriodComparison;
  byCategory: { categoryId: string; current: number; previous: number }[];
}> {
  const supabase = await createClient();
  const days = range === "week" ? 7 : range === "month" ? 30 : 90;
  const cur = rangeBounds(range);
  const prevEnd = addDays(cur.start, -1);
  const prevStart = addDays(prevEnd, -(days - 1));

  async function fetchRange(start: string, end: string) {
    const { data, error } = await supabase
      .from("transactions")
      .select("category_id, amount")
      .gte("spent_at", start)
      .lt("spent_at", addDays(end, 1));
    if (error) throw error;
    return (data ?? []) as { category_id: string; amount: number }[];
  }

  const [curRows, prevRows] = await Promise.all([
    fetchRange(cur.start, cur.end),
    fetchRange(prevStart, prevEnd),
  ]);

  const sum = (rows: { amount: number }[]) =>
    rows.reduce((a, r) => a + Number(r.amount), 0);
  const byCat = (rows: { category_id: string; amount: number }[]) => {
    const m: Record<string, number> = {};
    for (const r of rows) m[r.category_id] = (m[r.category_id] ?? 0) + Number(r.amount);
    return m;
  };

  const current = sum(curRows);
  const previous = sum(prevRows);
  const curByCat = byCat(curRows);
  const prevByCat = byCat(prevRows);

  const ids = new Set([...Object.keys(curByCat), ...Object.keys(prevByCat)]);
  const byCategory = [...ids]
    .map((categoryId) => ({
      categoryId,
      current: curByCat[categoryId] ?? 0,
      previous: prevByCat[categoryId] ?? 0,
    }))
    .sort((a, b) => b.current - a.current);

  return {
    total: {
      current,
      previous,
      delta: current - previous,
      deltaPct: previous > 0 ? ((current - previous) / previous) * 100 : null,
    },
    byCategory,
  };
}

// Add `n` days (can be negative) to a YYYY-MM-DD string.
function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
  date.setUTCDate(date.getUTCDate() + n);
  const yy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}
