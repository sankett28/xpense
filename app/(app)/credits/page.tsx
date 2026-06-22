import { listCredits } from "@/lib/queries/credits";
import { getCurrentCycle } from "@/lib/queries/cycles";
import { CreditForm } from "@/components/quick-log/CreditForm";
import { Card } from "@/components/ui/Card";
import { formatINR } from "@/lib/utils/currency";
import { formatDate, formatDateRange } from "@/lib/utils/date";
import type { Credit } from "@/lib/types";

// Credits screen: log salary + other credits, show the current cycle definition,
// and present history grouped into salary (cycle anchors) vs other inflow.
export default async function CreditsPage() {
  const [credits, cycle] = await Promise.all([
    listCredits(),
    getCurrentCycle(),
  ]);

  const salary = credits.filter((c) => c.kind === "salary");
  const others = credits.filter((c) => c.kind !== "salary");

  return (
    <div className="pt-4">
      <h1 className="font-display text-3xl text-ink">Credits</h1>

      {/* Current cycle definition. */}
      <Card className="mt-4">
        <span className="label-caps">Current cycle</span>
        {cycle ? (
          <p className="mt-1 text-ink">
            {formatDateRange(cycle.start, cycle.end)} · Day {cycle.dayNumber}
          </p>
        ) : (
          <p className="mt-1 text-ink-soft">
            No salary logged yet — log a salary below to start a cycle.
          </p>
        )}
      </Card>

      <div className="mt-4">
        <CreditForm />
      </div>

      {/* History: salary anchors. */}
      <section className="mt-8">
        <span className="label-caps">Salary (cycle anchors)</span>
        <CreditList
          credits={salary}
          emptyText="No salary credits yet."
          showAnchor
        />
      </section>

      {/* History: other inflow. */}
      <section className="mt-8">
        <span className="label-caps">Other credits</span>
        <CreditList credits={others} emptyText="No other credits yet." />
      </section>
    </div>
  );
}

function CreditList({
  credits,
  emptyText,
  showAnchor = false,
}: {
  credits: Credit[];
  emptyText: string;
  showAnchor?: boolean;
}) {
  if (credits.length === 0) {
    return <p className="mt-2 text-sm text-ink-soft">{emptyText}</p>;
  }
  return (
    <div className="mt-2 flex flex-col divide-y divide-ink-soft/15">
      {credits.map((c) => (
        <div key={c.id} className="flex items-center justify-between py-3">
          <div className="min-w-0">
            <p className="truncate text-ink">
              {c.source || (showAnchor ? "Salary" : capitalize(c.kind))}
            </p>
            <p className="label-caps">
              {formatDate(c.credited_at)}
              {!showAnchor ? ` · ${capitalize(c.kind)}` : ""}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3 text-right">
            <p className="font-mono text-ink tabular-nums">
              {formatINR(c.amount)}
            </p>
            {showAnchor && (
              <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] uppercase tracking-wide text-ink">
                Anchor
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
