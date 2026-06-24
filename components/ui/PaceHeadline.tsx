import { GlidePath } from "@/components/ui/GlidePath";
import { paceHue, savingsVerdictLabel } from "@/lib/utils/paceHue";
import { formatINR } from "@/lib/utils/currency";
import type { PaceResult } from "@/lib/types";

export function PaceHeadline({ pace }: { pace: PaceResult }) {
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
