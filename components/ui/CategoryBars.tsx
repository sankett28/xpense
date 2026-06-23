import { formatINR } from "@/lib/utils/currency";
import { tokenColor } from "@/lib/utils/color";

export interface CategoryBarDatum {
  id: string;
  name: string;
  color: string | null;
  total: number;
}

interface CategoryBarsProps {
  data: CategoryBarDatum[];
  // Bars are sized relative to this; defaults to the largest total.
  max?: number;
  className?: string;
}

// Horizontal spend-by-category bars, sized relative to the largest. Each bar
// uses its category's palette token color (falling back to the accent).
export function CategoryBars({ data, max, className = "" }: CategoryBarsProps) {
  if (data.length === 0) {
    return (
      <p className={["text-sm text-ink-soft", className].join(" ")}>
        No spending yet.
      </p>
    );
  }

  const peak = max ?? Math.max(...data.map((d) => d.total), 1);

  return (
    <div className={["flex flex-col gap-3", className].join(" ")}>
      {data.map((d) => {
        const pct = Math.max(2, Math.min(100, (d.total / peak) * 100));
        const fill = tokenColor(d.color) ?? "var(--accent)";
        return (
          <div key={d.id}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-sm text-ink">{d.name}</span>
              <span className="font-mono text-sm text-ink tabular-nums">
                {formatINR(d.total)}
              </span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, backgroundColor: fill }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default CategoryBars;
