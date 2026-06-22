import { Plus } from "lucide-react";
import type { Category } from "@/lib/types";
import { CategoryRow } from "@/components/ui/CategoryRow";
import { Button } from "@/components/ui/Button";

// Dummy categories for the design-system preview (no data wiring yet).
const SAMPLE: Array<{ category: Category; amount: number }> = [
  {
    category: mkCategory("Food & Dining", "#3e4634", "utensils"),
    amount: 4200,
  },
  {
    category: mkCategory("Transport", "#5c634f", "bus"),
    amount: 1850,
  },
  {
    category: mkCategory("Shopping", "#c8c8b2", "shopping"),
    amount: 3100,
  },
  {
    category: mkCategory("Bills & Utilities", null, "bills"),
    amount: 2400,
  },
];

function mkCategory(name: string, color: string | null, icon: string): Category {
  return {
    id: name,
    user_id: "sample",
    name,
    icon,
    color,
    monthly_budget: null,
    sort_order: 0,
    is_archived: false,
    created_at: "2026-01-01",
  };
}

// Categories stub — placeholder list using CategoryRow + a visual add button.
export default function CategoriesPage() {
  return (
    <div className="py-6">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-ink">Categories</h1>
          <p className="mt-1 text-sm text-ink-soft">Coming soon.</p>
        </div>
        <Button size="sm" aria-label="Add category">
          <Plus size={16} />
          Add
        </Button>
      </header>

      {SAMPLE.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink-soft/30 bg-surface/50 px-4 py-10 text-center">
          <p className="text-ink-soft">No categories yet.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {SAMPLE.map(({ category, amount }) => (
            <CategoryRow key={category.id} category={category} amount={amount} />
          ))}
        </div>
      )}
    </div>
  );
}
