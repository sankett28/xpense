import Link from "next/link";
import { getCurrentCycle, getCycleTotals } from "@/lib/queries/cycles";
import { listItems } from "@/lib/queries/items";
import { listCategories } from "@/lib/queries/categories";
import { listRecentTransactions } from "@/lib/queries/transactions";
import { QuickLog } from "@/components/quick-log/QuickLog";
import { Hero } from "@/components/ui/Hero";
import { StatRow } from "@/components/ui/StatRow";
import { FullBleed } from "@/components/ui/FullBleed";
import { ColorBlock } from "@/components/ui/ColorBlock";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { TransactionRow } from "@/components/ui/TransactionRow";
import { Button } from "@/components/ui/Button";
import { formatDateRange } from "@/lib/utils/date";

// Home is the logging hub: hero (available balance) + budget/left stats +
// quick-log strip + recent transactions. Follows docs/design-system.md.
export default async function HomePage() {
  const cycle = await getCurrentCycle();
  const [items, categories, recent] = await Promise.all([
    listItems(),
    listCategories(),
    listRecentTransactions(8),
  ]);

  const totals = cycle ? await getCycleTotals(cycle) : null;

  const itemName = new Map(items.map((i) => [i.id, i.name]));
  const itemIcon = new Map(items.map((i) => [i.id, i.icon]));
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  const categoryIcon = new Map(categories.map((c) => [c.id, c.icon]));
  const categoryColor = new Map(categories.map((c) => [c.id, c.color]));

  // Label like "AVAILABLE JUNE BUDGET" from the cycle start month.
  const monthLabel = cycle
    ? new Date(cycle.start + "T00:00:00").toLocaleString("en-IN", {
        month: "long",
      })
    : "";

  const overrun = totals != null && totals.available < 0;

  return (
    <div className="pt-4">
      {cycle && totals ? (
        <>
          {/* Hero: available balance for the current cycle. */}
          <Hero
            label={`Available ${monthLabel} budget`}
            amount={totals.available}
            tone="auto"
          />

          {/* Budget / Left stat rows with the tick motif. */}
          <div className="mt-6 flex flex-col gap-4">
            <StatRow label="Budget" amount={totals.totalCredited} ticks />
            <StatRow
              label="Left"
              amount={totals.available}
              tone="auto"
              ticks
            />
          </div>

          <p className="mt-4 text-sm text-ink-soft">
            Current cycle: {formatDateRange(cycle.start, cycle.end)} · Day{" "}
            {cycle.dayNumber}
          </p>

          {/* Overrun banner (full-bleed terracotta) only when over budget. */}
          {overrun && (
            <FullBleed className="mt-6">
              <ColorBlock
                variant="alert"
                label="⚠ Budget overrun"
                amount={totals.totalSpent}
              />
            </FullBleed>
          )}
        </>
      ) : (
        // Edge case: no salary logged yet. Prompt instead of showing zero.
        <div className="pt-2">
          <DisplayHeading muted="Log your" bold="Salary" />
          <p className="mt-3 text-sm text-ink-soft">
            Your budgeting period is anchored to your salary credit date. Log a
            salary to start a cycle.
          </p>
          <Link href="/credits" className="mt-5 inline-block">
            <Button variant="primary">Log salary</Button>
          </Link>
        </div>
      )}

      {/* Quick-log strip. */}
      <QuickLog items={items} categories={categories} />

      {/* Recent transactions. */}
      <section className="mt-10">
        <span className="label-caps">Recent</span>
        {recent.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">
            No expenses yet. Tap a tile above to log one.
          </p>
        ) : (
          <div className="mt-2 flex flex-col divide-y divide-ink-soft/15">
            {recent.map((t) => (
              <TransactionRow
                key={t.id}
                transaction={t}
                icon={
                  (t.item_id ? itemIcon.get(t.item_id) : null) ??
                  categoryIcon.get(t.category_id) ??
                  undefined
                }
                itemName={
                  (t.item_id ? itemName.get(t.item_id) : null) ?? "Expense"
                }
                categoryName={categoryName.get(t.category_id) ?? ""}
                accentColor={categoryColor.get(t.category_id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
