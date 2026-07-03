import { GlidePath } from "@/components/ui/GlidePath";
import { paceHue, savingsVerdictLabel } from "@/lib/utils/paceHue";
import { formatINR } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";
import type { PaceResult } from "@/lib/types";

export function PaceHeadline({
  pace,
  overdue = false,
  expectedEnd,
  remaining = 0,
}: {
  pace: PaceResult;
  overdue?: boolean;
  expectedEnd?: string;
  remaining?: number;
}) {
  // Overdue: the expected payday has passed with no new salary logged, so the
  // per-day projection is meaningless. Show what's left in the extended cycle.
  if (overdue) {
    return (
      <section className="pt-6">
        <p className="label-caps text-alert">
          Salary overdue{expectedEnd ? ` since ${formatDate(expectedEnd)}` : ""}
        </p>
        <p className="font-display tabular-nums text-7xl font-light leading-none mt-2">
          {formatINR(remaining)}
        </p>
        <p className="mt-2 text-lg text-ink-dim">
          Remaining this cycle · log your salary to start the next one
        </p>
      </section>
    );
  }

  const belowGoal = pace.projectedSavings < pace.savingsGoal;
  const gap = Math.abs(pace.projectedSavings - pace.savingsGoal);
  // "over"/"under" describe where the projected saving lands vs the goal.
  const gapWord = belowGoal ? "under" : "over";
  const numberColor = belowGoal ? paceHue(pace.paceRatio) : "var(--color-ink)";

  return (
    <section className="pt-6">
      <p className="label-caps">{savingsVerdictLabel(pace.verdict)}</p>
      <p
        className="font-display tabular-nums text-7xl font-light leading-none mt-2"
        style={{ color: numberColor }}
      >
        {formatINR(pace.projectedSavings)}
      </p>
      <p className="mt-2 text-lg text-ink-dim">
        {gap < 1
          ? `Right on your ${formatINR(pace.savingsGoal)} goal`
          : `${formatINR(gap)} ${gapWord} your ${formatINR(pace.savingsGoal)} goal`}
      </p>
      <GlidePath paceRatio={pace.paceRatio} size="hero" />
    </section>
  );
}
