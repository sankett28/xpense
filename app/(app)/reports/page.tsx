import Link from "next/link";
import { Card, CardLabel } from "@/components/ui/Card";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { AmountText } from "@/components/ui/AmountText";
import { CategoryBars } from "@/components/ui/CategoryBars";
import {
  getRangeReport,
  getRangeComparison,
  type ReportRange,
} from "@/lib/queries/reports";
import { listCategories } from "@/lib/queries/categories";
import { formatINR } from "@/lib/utils/currency";
import { formatDateRange } from "@/lib/utils/date";

const RANGES = ["week", "month", "quarter"] as const;

// Reports: rolling week / month / quarter spend — total, daily average, count,
// and a per-category breakdown. Wired to the live data layer. Trend charts are
// a later phase.
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const active: ReportRange = (RANGES as readonly string[]).includes(range ?? "")
    ? (range as ReportRange)
    : "month";

  const [report, comparison, categories] = await Promise.all([
    getRangeReport(active),
    getRangeComparison(active),
    listCategories(),
  ]);

  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const catColor = new Map(categories.map((c) => [c.id, c.color]));

  const cmp = comparison.total;
  const up = cmp.delta > 0;
  const rangeWord = active === "week" ? "week" : active === "month" ? "30 days" : "quarter";

  // Categories with the biggest swing vs the previous period.
  const movers = comparison.byCategory
    .map((c) => ({
      name: catName.get(c.categoryId) ?? "Uncategorized",
      delta: c.current - c.previous,
    }))
    .filter((c) => Math.abs(c.delta) > 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 4);

  const bars = report.byCategory.map((c) => ({
    id: c.categoryId,
    name: catName.get(c.categoryId) ?? "Uncategorized",
    color: catColor.get(c.categoryId) ?? null,
    total: c.total,
  }));

  return (
    <div className="pt-4">
      <DisplayHeading muted="Your" bold="Reports" />
      <p className="mt-2 mb-5 text-sm text-ink-soft">
        {formatDateRange(report.bounds.start, report.bounds.end)}
      </p>

      {/* Range toggle */}
      <div className="mb-5 inline-flex rounded-full bg-surface-2 p-1">
        {RANGES.map((r) => {
          const isActive = r === active;
          return (
            <Link
              key={r}
              href={`/reports?range=${r}`}
              aria-current={isActive ? "page" : undefined}
              className={[
                "rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors",
                isActive
                  ? "bg-accent text-on-dark"
                  : "text-ink-soft hover:text-ink",
              ].join(" ")}
            >
              {r}
            </Link>
          );
        })}
      </div>

      {/* Totals */}
      <Card>
        <CardLabel>Total spent</CardLabel>
        <div className="mt-2">
          <AmountText amount={report.totalSpent} size="lg" />
        </div>
        <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm text-ink-soft">
          <span>
            Daily avg{" "}
            <AmountText amount={Math.round(report.dailyAverage)} size="sm" />
          </span>
          <span>
            {report.count} {report.count === 1 ? "expense" : "expenses"}
          </span>
        </div>
      </Card>

      {/* vs previous period */}
      <Card className="mt-4">
        <CardLabel>vs previous {rangeWord}</CardLabel>
        <p className="mt-2 text-ink">
          {cmp.previous === 0 ? (
            "No spending in the previous period to compare."
          ) : (
            <>
              <span className={up ? "text-alert" : "text-ink"}>
                {up ? "Up" : "Down"} {formatINR(Math.abs(cmp.delta))}
              </span>{" "}
              <span className="text-ink-soft">
                ({cmp.deltaPct !== null ? `${up ? "+" : "−"}${Math.abs(Math.round(cmp.deltaPct))}%` : "—"} ·
                was {formatINR(cmp.previous)})
              </span>
            </>
          )}
        </p>

        {movers.length > 0 && (
          <div className="mt-3 flex flex-col gap-1.5 border-t border-ink-soft/15 pt-3">
            {movers.map((m) => {
              const moverUp = m.delta > 0;
              return (
                <div
                  key={m.name}
                  className="flex items-baseline justify-between text-sm"
                >
                  <span className="text-ink">{m.name}</span>
                  <span
                    className={[
                      "font-mono tabular-nums",
                      moverUp ? "text-alert" : "text-ink-soft",
                    ].join(" ")}
                  >
                    {moverUp ? "+" : "−"}
                    {formatINR(Math.abs(m.delta))}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Spend by category */}
      <Card className="mt-4">
        <CardLabel>Spend by category</CardLabel>
        <CategoryBars data={bars} className="mt-4" />
      </Card>
    </div>
  );
}
