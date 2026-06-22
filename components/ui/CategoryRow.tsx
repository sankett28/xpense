import type { Category } from "@/lib/types";
import { formatINR } from "@/lib/utils/currency";
import { tokenColor } from "@/lib/utils/color";

export interface CategoryRowProps {
  category: Category;
  amount?: number | null;
  className?: string;
}

// Full-width colour-blocked row: category name on the left, amount on the
// right (mono, formatted). Uses the category colour as the block background.
export function CategoryRow({ category, amount, className = "" }: CategoryRowProps) {
  const bg = tokenColor(category.color);
  return (
    <div
      className={[
        "flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl",
        bg ? "" : "bg-surface-2",
        className,
      ].join(" ")}
      style={bg ? { backgroundColor: bg } : undefined}
    >
      <span className="text-ink font-medium truncate">{category.name}</span>
      <span className="font-mono text-ink tabular-nums shrink-0">
        {formatINR(amount)}
      </span>
    </div>
  );
}

export default CategoryRow;
