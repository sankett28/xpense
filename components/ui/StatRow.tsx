import { AmountText } from "./AmountText";

export interface StatRowProps {
  label: string;
  amount: number | null | undefined;
  tone?: "ink" | "alert" | "auto";
  // Show the vertical tick motif behind the value (reference style).
  ticks?: boolean;
  className?: string;
}

// A labelled figure with a top hairline rule — e.g. BUDGET ₹2,045 / LEFT ₹1,894.
// Optionally renders the tick motif filling the row behind the amount.
export function StatRow({
  label,
  amount,
  tone = "ink",
  ticks = false,
  className = "",
}: StatRowProps) {
  return (
    <div
      className={[
        "relative flex items-baseline justify-between gap-4 border-t border-ink-soft/25 pt-3",
        className,
      ].join(" ")}
    >
      {ticks && (
        <div className="tick-motif pointer-events-none absolute inset-x-0 bottom-1 top-3" />
      )}
      <span className="label-caps relative">{label}</span>
      <span className="relative">
        <AmountText amount={amount} size="lg" tone={tone} />
      </span>
    </div>
  );
}

export default StatRow;
