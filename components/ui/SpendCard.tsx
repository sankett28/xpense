import { formatINR } from "@/lib/utils/currency";

interface SpendCardProps {
  spent: number;
  // Income credited this cycle; drives the progress line. When 0/absent, the
  // line and "left" caption are hidden (no salary logged yet).
  income: number;
}

// Home's one honest number: spend this month, with a single hairline progress
// line (spent vs income) and a quiet "of ₹X · ₹Y left" caption. One number, one
// line, one stat — descriptive, never a budget warning. See docs/design-system.md.
export function SpendCard({ spent, income }: SpendCardProps) {
  const hasIncome = income > 0;
  const left = income - spent;
  const over = left < 0;
  const pct = hasIncome ? Math.min(100, (spent / income) * 100) : 0;

  return (
    <section className="rounded-3xl bg-surface p-7 shadow-[0_1px_0_rgba(22,48,61,0.04)]">
      <span className="label-caps">Spent this month</span>

      <div className="mt-3 font-mono text-6xl font-semibold tracking-tight text-ink tabular-nums">
        {formatINR(spent)}
      </div>

      {/* Single hairline progress line: spent vs income. Always shown — at zero
          income it reads as an empty track + a prompt, so the card is never bare. */}
      <div className="mt-6">
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className={over ? "h-full bg-alert" : "h-full bg-accent"}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-2.5 text-sm text-ink-soft">
          {hasIncome ? (
            <>
              of {formatINR(income)} ·{" "}
              <span className={over ? "text-alert" : "text-ink"}>
                {over
                  ? `${formatINR(Math.abs(left))} over`
                  : `${formatINR(left)} left`}
              </span>
            </>
          ) : (
            "Log a credit to see what's left"
          )}
        </p>
      </div>
    </section>
  );
}

export default SpendCard;
