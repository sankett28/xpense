import { getCyclePace } from "@/lib/queries/pace";
import { listRecentTransactions } from "@/lib/queries/transactions";
import { getActiveTrip } from "@/lib/queries/trips";
import { PaceHeadline } from "@/components/ui/PaceHeadline";
import { GlidePath } from "@/components/ui/GlidePath";
import { TripNotice } from "@/components/vacation/TripNotice";
import { verdictLabel } from "@/lib/utils/paceHue";
import { formatINR } from "@/lib/utils/currency";
import { formatTime } from "@/lib/utils/date";
import type { CategoryPace } from "@/lib/types";

// Dashboard: where is it leaking? Roll-up pace at the top, then per-category
// pace (over-trending first), then recent spend.
export default async function DashboardPage() {
  const [paceData, recent, activeTrip] = await Promise.all([
    getCyclePace(),
    listRecentTransactions(6),
    getActiveTrip(),
  ]);

  if (!paceData?.plan) {
    return (
      <p className="pt-8 text-ink-dim">
        Set up your budget on the Plan screen to see your dashboard.
      </p>
    );
  }

  const { cycle, pace, categories } = paceData;

  return (
    <div className="pt-8">
      {activeTrip ? <TripNotice name={activeTrip.name} /> : null}
      <p className="label-caps">
        This cycle · Day {cycle.daysElapsed} of {cycle.daysInCycle}
      </p>

      <PaceHeadline pace={pace} />

      <p className="label-caps mt-8">On pace by category</p>
      <div className="mt-2">
        {categories.map((c) => (
          <CategoryPaceRow key={c.categoryId} c={c} />
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <p className="label-caps">Recent</p>
      </div>
      <ul className="mt-2 divide-y divide-hairline border-t border-hairline">
        {recent.map((t) => (
          <li key={t.id} className="flex items-center justify-between py-3">
            <span className="text-ink">{t.note ?? "Expense"}</span>
            <span className="flex items-center gap-3">
              <span className="tabular-nums text-ink">{formatINR(Number(t.amount))}</span>
              <span className="text-xs text-ink-dim">{formatTime(t.spent_at)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CategoryPaceRow({ c }: { c: CategoryPace }) {
  const verdict =
    c.verdict === "over" ? "over" : c.verdict === "under" ? "under" : "on track";
  return (
    <div className="py-3 border-b border-hairline">
      <div className="flex items-center justify-between">
        <span className="text-ink">{c.name}</span>
        <span className="label-caps">{verdict}</span>
      </div>
      <GlidePath paceRatio={c.paceRatio} size="row" label={`${c.name}: ${verdictLabel(c.verdict)}`} />
      <p className="text-xs text-ink-dim tabular-nums">
        {formatINR(c.spent)} / {formatINR(c.allowance)} · proj {formatINR(c.projected)}
      </p>
    </div>
  );
}
