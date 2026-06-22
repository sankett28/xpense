import Link from "next/link";
import { getCurrentCycle, getCycleTotals } from "@/lib/queries/cycles";
import { listItems } from "@/lib/queries/items";
import { listCategories } from "@/lib/queries/categories";
import { listRecentTransactions } from "@/lib/queries/transactions";
import { QuickLog } from "@/components/quick-log/QuickLog";
import { Card } from "@/components/ui/Card";
import { TransactionRow } from "@/components/ui/TransactionRow";
import { Button } from "@/components/ui/Button";
import { formatINR } from "@/lib/utils/currency";
import { formatDateRange } from "@/lib/utils/date";

// Home is the logging hub: hero (available balance for the active cycle) +
// quick-log strip + recent transactions. Server Component; data is fetched per
// request and revalidated after each logExpense/logCredit mutation.
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

  return (
    <div className="pt-4">
      {/* Hero: available balance for the current cycle. */}
      {cycle && totals ? (
        <Card className="relative overflow-hidden">
          <div className="tick-motif pointer-events-none absolute inset-0" />
          <div className="relative">
            <span className="label-caps">Available this cycle</span>
            <div
              className={[
                "font-mono text-5xl tabular-nums",
                totals.available < 0 ? "text-alert" : "text-ink",
              ].join(" ")}
            >
              {formatINR(totals.available)}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink-soft">
              <span>
                Credited{" "}
                <span className="font-mono text-ink">
                  {formatINR(totals.totalCredited)}
                </span>
              </span>
              <span>
                Spent{" "}
                <span className="font-mono text-ink">
                  {formatINR(totals.totalSpent)}
                </span>
              </span>
            </div>
            <p className="mt-2 text-sm text-ink-soft">
              Current cycle: {formatDateRange(cycle.start, cycle.end)} · Day{" "}
              {cycle.dayNumber}
            </p>
          </div>
        </Card>
      ) : (
        // Edge case: no salary logged yet. Prompt instead of showing zero.
        <Card>
          <span className="label-caps">No active cycle</span>
          <p className="mt-1 font-display text-2xl text-ink">
            Log your salary to start a budget cycle
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            Your budgeting period is anchored to your salary credit date.
          </p>
          <Link href="/credits" className="mt-4 inline-block">
            <Button variant="primary">Log salary</Button>
          </Link>
        </Card>
      )}

      {/* Quick-log strip. */}
      <QuickLog items={items} categories={categories} />

      {/* Recent transactions. */}
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <span className="label-caps">Recent</span>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-ink-soft">
            No expenses yet. Tap a tile above to log one.
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-ink-soft/15">
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
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
