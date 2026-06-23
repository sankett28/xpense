import { Plus } from "lucide-react";
import { listCategories } from "@/lib/queries/categories";
import { getCurrentCycle, getSpendByCategory } from "@/lib/queries/cycles";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { FullBleed } from "@/components/ui/FullBleed";
import { ColorBlock } from "@/components/ui/ColorBlock";
import { BudgetBar } from "@/components/ui/BudgetBar";
import { tokenColor } from "@/lib/utils/color";

// Categories: each is a container of items. Per category we show this cycle's
// spend and, if a soft cap is set, a progress bar that simply reflects reality —
// overflowing in alert color when exceeded (descriptive, never a warning).
// Full add/edit management is a later phase. Follows docs/design-system.md.
export default async function CategoriesPage() {
  const [categories, cycle] = await Promise.all([
    listCategories(),
    getCurrentCycle(),
  ]);
  const spendByCategory = cycle ? await getSpendByCategory(cycle) : {};

  return (
    <div className="pt-4">
      <DisplayHeading muted="Your" bold="Categories" />

      <FullBleed className="mt-6 flex flex-col">
        {/* Add block (mustard, giant +). Wires to add-category in a later phase. */}
        <ColorBlock
          variant="accent"
          label="Add a category"
          center={<Plus size={48} strokeWidth={1.5} className="text-ink" />}
        />

        {/* Existing categories: spend + soft-budget bar. */}
        {categories.map((c) => {
          // Dark/custom blocks read better with on-dark fills; light ones with ink.
          const onDark = !tokenColor(c.color) || isDarkToken(c.color);
          return (
            <ColorBlock
              key={c.id}
              variant={c.color ? "custom" : "dark"}
              color={c.color}
              label={c.name}
            >
              <BudgetBar
                spent={spendByCategory[c.id] ?? 0}
                cap={c.monthly_budget}
                tone={onDark ? "on-dark" : "ink"}
                className="mt-3"
              />
            </ColorBlock>
          );
        })}
      </FullBleed>

      {categories.length === 0 && (
        <p className="mt-4 text-sm text-ink-soft">
          Your default categories will appear here after first login.
        </p>
      )}
    </div>
  );
}

// Tokens dark enough to need light text/fills on top.
function isDarkToken(color: string | null): boolean {
  return color === "dark" || color === "ink" || color === "ink-soft";
}
