import { listTransactions } from "@/lib/queries/transactions";
import { listCategories } from "@/lib/queries/categories";
import { listItems } from "@/lib/queries/items";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { HistoryFilters } from "@/components/quick-log/HistoryFilters";
import { HistoryList } from "@/components/quick-log/HistoryList";
import { AmountText } from "@/components/ui/AmountText";

// Full searchable, filterable expense history with tap-to-edit/delete. The
// trust foundation: every logged expense is findable and fixable.
export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string }>;
}) {
  const { q, cat } = await searchParams;

  const [{ rows, count }, categories, items] = await Promise.all([
    listTransactions({ search: q, categoryId: cat, limit: 100 }),
    listCategories(),
    listItems(),
  ]);

  const itemNames = Object.fromEntries(items.map((i) => [i.id, i.name]));
  const itemIcons = Object.fromEntries(items.map((i) => [i.id, i.icon]));
  const total = rows.reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <div className="pt-4">
      <DisplayHeading muted="Your" bold="History" />

      <HistoryFilters categories={categories} />

      <div className="mt-5 flex items-baseline justify-between">
        <span className="label-caps">
          {count} {count === 1 ? "expense" : "expenses"}
        </span>
        <span className="text-sm text-ink-soft">
          Total <AmountText amount={total} size="sm" />
        </span>
      </div>

      <HistoryList
        transactions={rows}
        categories={categories}
        itemNames={itemNames}
        itemIcons={itemIcons}
      />
    </div>
  );
}
