import { getCyclePace } from "@/lib/queries/pace";
import { listItems } from "@/lib/queries/items";
import { listCategories } from "@/lib/queries/categories";
import { getGreetingName } from "@/lib/queries/profile";
import { runMaterialize } from "@/lib/queries/recurring";
import { PaceHeadline } from "@/components/ui/PaceHeadline";
import { HomeLogger } from "@/components/quick-log/HomeLogger";
import { formatINR } from "@/lib/utils/currency";

// Home: are you on pace to land safe? The PaceHeadline answers it; today /
// to-date / safe-to-spend sit beneath; the + logging hero is unchanged.
export default async function HomePage() {
  await runMaterialize();

  const [name, paceData, items, categories] = await Promise.all([
    getGreetingName(),
    getCyclePace(),
    listItems(),
    listCategories(),
  ]);

  return (
    <div className="flex min-h-[calc(100dvh-64px)] flex-col">
      <h1 className="font-display text-3xl font-light text-ink pt-8">
        Hi {name}
      </h1>

      {paceData?.plan ? (
        <>
          <PaceHeadline pace={paceData.pace} />
          <dl className="mt-2 divide-y divide-hairline border-t border-hairline">
            <Stat label="Spent today" value={formatINR(paceData.spentToday)} />
            <Stat label="Spent this cycle" value={formatINR(paceData.spentSoFar)} />
            <Stat label="Safe to spend today" value={formatINR(paceData.pace.safeToSpendToday)} />
          </dl>
        </>
      ) : (
        <p className="mt-6 text-ink-dim">
          Set up your budget on the Plan screen to start tracking your pace.
        </p>
      )}

      <HomeLogger categories={categories} recentItems={items.slice(0, 6)} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3">
      <dt className="label-caps">{label}</dt>
      <dd className="tabular-nums text-ink">{value}</dd>
    </div>
  );
}
