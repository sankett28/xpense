import { getCurrentCycle, getCycleTotals } from "@/lib/queries/cycles";
import { listItems } from "@/lib/queries/items";
import { listCategories } from "@/lib/queries/categories";
import { getGreetingName } from "@/lib/queries/profile";
import { runMaterialize } from "@/lib/queries/recurring";
import { SpendCard } from "@/components/ui/SpendCard";
import { HomeLogger } from "@/components/quick-log/HomeLogger";

// Home is a launchpad, not a dashboard: a warm welcome, one honest spend number,
// and a giant + that owns the lower half because logging is the job. Follows
// docs/design-system.md.
export default async function HomePage() {
  // Materialize any due recurring charges first (idempotent) so the spend
  // figures below include them. No background job needed — it runs on visit.
  await runMaterialize();

  const [name, cycle, items, categories] = await Promise.all([
    getGreetingName(),
    getCurrentCycle(),
    listItems(),
    listCategories(),
  ]);

  const totals = cycle ? await getCycleTotals(cycle) : null;
  const spent = totals?.totalSpent ?? 0;
  const income = totals?.totalCredited ?? 0;

  return (
    <div className="flex min-h-[calc(100dvh-64px)] flex-col pt-8">
      {/* Welcome. Friendly, casual — the sketch's handwritten warmth. */}
      <h1 className="font-display text-4xl font-medium text-ink">
        Welcome {name},
      </h1>

      {/* The one honest number. */}
      <div className="mt-7">
        <SpendCard spent={spent} income={income} />
      </div>

      {/* The logging hero owns everything below. */}
      <HomeLogger categories={categories} recentItems={items.slice(0, 6)} />
    </div>
  );
}
