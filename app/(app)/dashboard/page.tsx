import {
  getCurrentCycle,
  getCycleTotals,
  getSpendByCategory,
} from "@/lib/queries/cycles";
import { listCategories } from "@/lib/queries/categories";
import { listItems } from "@/lib/queries/items";
import { listRecentTransactions } from "@/lib/queries/transactions";
import { Card, CardLabel } from "@/components/ui/Card";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { CategoryBars } from "@/components/ui/CategoryBars";
import { TransactionRow } from "@/components/ui/TransactionRow";
import { AmountText } from "@/components/ui/AmountText";
import { formatINR } from "@/lib/utils/currency";
import { formatDateRange, daysBetween, todayISO } from "@/lib/utils/date";

// Dashboard: this cycle at a glance — in / out / left, spend by category, and
// recent transactions. Wired to the live data layer. The radial line-burst
// visual is a later phase.
export default async function DashboardPage() {
  const cycle = await getCurrentCycle();
  const [categories, items, recent] = await Promise.all([
    listCategories(),
    listItems(),
    listRecentTransactions(6),
  ]);

  const totals = cycle ? await getCycleTotals(cycle) : null;
  const spendByCat = cycle ? await getSpendByCategory(cycle) : {};

  const itemName = new Map(items.map((i) => [i.id, i.name]));
  const itemIcon = new Map(items.map((i) => [i.id, i.icon]));
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const catIcon = new Map(categories.map((c) => [c.id, c.icon]));
  const catColor = new Map(categories.map((c) => [c.id, c.color]));

  const bars = categories
    .map((c) => ({
      id: c.id,
      name: c.name,
      color: c.color,
      total: spendByCat[c.id] ?? 0,
    }))
    .filter((b) => b.total > 0)
    .sort((a, b) => b.total - a.total);

  // "What needs attention": categories over their soft cap, plus daily burn rate.
  const overCap = categories
    .filter((c) => c.monthly_budget && c.monthly_budget > 0)
    .map((c) => ({
      name: c.name,
      spent: spendByCat[c.id] ?? 0,
      cap: c.monthly_budget as number,
    }))
    .filter((c) => c.spent > c.cap)
    .sort((a, b) => b.spent - b.cap - (a.spent - a.cap));

  const daysElapsed = cycle ? Math.max(1, daysBetween(cycle.start, todayISO()) + 1) : 1;
  const burnPerDay = totals ? totals.totalSpent / daysElapsed : 0;

  return (
    <div className="pt-4">
      <DisplayHeading muted="This cycle" bold="Dashboard" />
      {cycle ? (
        <p className="mt-2 text-sm text-ink-soft">
          {formatDateRange(cycle.start, cycle.end)} · Day {cycle.dayNumber}
        </p>
      ) : (
        <p className="mt-2 text-sm text-ink-soft">
          No salary logged yet — totals appear once a cycle starts.
        </p>
      )}

      {/* In / Out / Left */}
      <Card className="mt-5">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="In" amount={totals?.totalCredited ?? 0} />
          <Stat label="Out" amount={totals?.totalSpent ?? 0} />
          <Stat
            label="Left"
            amount={totals ? totals.available : 0}
            tone="auto"
          />
        </div>
      </Card>

      {/* What needs attention: burn rate + over-cap categories. */}
      <Card className="mt-4">
        <CardLabel>Needs attention</CardLabel>
        <div className="mt-3 flex items-baseline justify-between">
          <span className="text-sm text-ink-soft">Daily burn rate</span>
          <span className="font-mono text-ink tabular-nums">
            {formatINR(Math.round(burnPerDay))}/day
          </span>
        </div>
        {overCap.length > 0 ? (
          <div className="mt-3 flex flex-col gap-2 border-t border-ink-soft/15 pt-3">
            {overCap.map((c) => (
              <div
                key={c.name}
                className="flex items-baseline justify-between text-sm"
              >
                <span className="text-ink">{c.name} over cap</span>
                <span className="font-mono text-alert tabular-nums">
                  +{formatINR(c.spent - c.cap)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 border-t border-ink-soft/15 pt-3 text-sm text-ink-soft">
            Nothing over its cap. Nicely paced.
          </p>
        )}
      </Card>

      {/* Spend by category */}
      <Card className="mt-4">
        <CardLabel>Spend by category</CardLabel>
        <CategoryBars data={bars} className="mt-4" />
      </Card>

      {/* Recent */}
      <Card className="mt-4">
        <CardLabel>Recent</CardLabel>
        {recent.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">No expenses yet.</p>
        ) : (
          <div className="mt-1 flex flex-col divide-y divide-ink-soft/15">
            {recent.map((t) => (
              <TransactionRow
                key={t.id}
                transaction={t}
                icon={
                  (t.item_id ? itemIcon.get(t.item_id) : null) ??
                  catIcon.get(t.category_id) ??
                  undefined
                }
                itemName={
                  (t.item_id ? itemName.get(t.item_id) : null) ?? "Expense"
                }
                categoryName={catName.get(t.category_id) ?? ""}
                accentColor={catColor.get(t.category_id)}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Stat({
  label,
  amount,
  tone = "ink",
}: {
  label: string;
  amount: number;
  tone?: "ink" | "auto";
}) {
  return (
    <div>
      <span className="label-caps">{label}</span>
      <div className="mt-1">
        <AmountText amount={amount} size="md" tone={tone} />
      </div>
    </div>
  );
}
