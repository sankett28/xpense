import { listRecurring } from "@/lib/queries/recurring";
import { listCategories } from "@/lib/queries/categories";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { RecurringManager } from "@/components/quick-log/RecurringManager";

// Recurring expenses: fixed monthly costs that log themselves. Editable and
// time-bound. They materialize into real, individually-editable transactions.
export default async function RecurringPage() {
  const [recurring, categories] = await Promise.all([
    listRecurring(),
    listCategories(),
  ]);

  return (
    <div className="pt-4">
      <DisplayHeading muted="Your" bold="Recurring" />
      <p className="mt-2 text-sm text-ink-soft">
        Fixed monthly costs that log themselves. Each one is editable, can be
        paused, and runs until its end date — or forever.
      </p>

      <RecurringManager recurring={recurring} categories={categories} />
    </div>
  );
}
