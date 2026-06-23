import { AmountText } from "./AmountText";

export interface BudgetBarProps {
  spent: number;
  // Optional soft cap. When set, the bar fills toward it and visibly overflows
  // (alert color) when exceeded. When null/0, no bar — just the spent figure.
  cap?: number | null;
  // Tone of the fill on a colored block: "on-dark" reads on dark/custom blocks.
  tone?: "ink" | "on-dark";
  className?: string;
}

// Soft-budget progress bar: descriptive, not prescriptive. Shows how spend sits
// against an optional cap. Going over the cap is shown as overflow in the alert
// color — never a warning or block. See docs/design-system.md.
export function BudgetBar({
  spent,
  cap,
  tone = "ink",
  className = "",
}: BudgetBarProps) {
  const hasCap = cap != null && cap > 0;
  const over = hasCap && spent > cap;

  // Within-cap portion as a percentage; capped at 100. The overflow is shown as
  // a thin alert segment appended after the full bar.
  const pct = hasCap ? Math.min(100, (spent / cap) * 100) : 0;
  const overflowPct = hasCap && over ? Math.min(100, ((spent - cap) / cap) * 100) : 0;

  const trackBg = tone === "on-dark" ? "bg-on-dark/20" : "bg-ink/10";
  const fillBg = tone === "on-dark" ? "bg-on-dark" : "bg-ink";

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-3">
        <AmountText amount={spent} size="sm" tone={tone} />
        {hasCap && (
          <span
            className={[
              "font-mono text-xs tabular-nums",
              over
                ? "text-alert"
                : tone === "on-dark"
                  ? "text-on-dark/70"
                  : "text-ink-soft",
            ].join(" ")}
          >
            / {capLabel(cap)}
          </span>
        )}
      </div>

      {hasCap && (
        <div className={["mt-1.5 flex h-1.5 w-full overflow-hidden rounded-full", trackBg].join(" ")}>
          {/* spend within cap */}
          <div
            className={over ? "bg-alert" : fillBg}
            style={{ width: `${pct}%` }}
          />
          {/* overshoot segment (alert), sized relative to the cap */}
          {over && (
            <div className="bg-alert/60" style={{ width: `${overflowPct}%` }} />
          )}
        </div>
      )}
    </div>
  );
}

// Compact cap label (e.g. ₹5,000) without pulling the full currency formatter
// into a tiny denominator slot.
function capLabel(cap: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(cap);
}
