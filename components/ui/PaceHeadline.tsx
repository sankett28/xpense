import { GlidePath } from "@/components/ui/GlidePath";
import { paceHue, verdictLabel } from "@/lib/utils/paceHue";
import { formatINR } from "@/lib/utils/currency";
import type { PaceResult } from "@/lib/types";

export function PaceHeadline({ pace }: { pace: PaceResult }) {
  const belowGoal = pace.projectedSavings < pace.savingsGoal;
  const gap = Math.abs(pace.projectedSavings - pace.savingsGoal);
  const gapWord = pace.projectedSavings >= pace.savingsGoal ? "ahead" : "short";
  const numberColor = belowGoal ? paceHue(pace.paceRatio) : "var(--color-ink)";

  return (
    <section className="pt-6">
      <p className="label-caps">{verdictLabel(pace.verdict)}</p>
      <p className="mt-1 text-xs text-ink-dim">Projected to save</p>
      <p
        className="font-display tabular-nums text-5xl font-light leading-none mt-1"
        style={{ color: numberColor }}
      >
        {formatINR(pace.projectedSavings)}
      </p>
      <p className="mt-2 text-sm text-ink-dim">
        Goal {formatINR(pace.savingsGoal)} · {formatINR(gap)} {gapWord}
      </p>
      <GlidePath paceRatio={pace.paceRatio} size="hero" />
    </section>
  );
}
