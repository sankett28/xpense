import { Plus } from "lucide-react";
import { listCategories } from "@/lib/queries/categories";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { FullBleed } from "@/components/ui/FullBleed";
import { ColorBlock } from "@/components/ui/ColorBlock";

// Categories: the signature "Add your / Budget Category" heading over stacked
// full-bleed color blocks (name top-left, per-cycle budget bottom-right). The
// mustard add block leads with a giant +. Full add/edit management is a later
// phase — this is read-only for now. Follows docs/design-system.md.
export default async function CategoriesPage() {
  const categories = await listCategories();

  return (
    <div className="pt-4">
      <DisplayHeading muted="Add your" bold="Budget Category" />

      <FullBleed className="mt-6 flex flex-col">
        {/* Add block (mustard, giant +). Wires to add-category in a later phase. */}
        <ColorBlock
          variant="accent"
          label="Financial"
          amount={0}
          center={<Plus size={48} strokeWidth={1.5} className="text-ink" />}
        />

        {/* Existing categories as stacked color blocks. */}
        {categories.map((c) => (
          <ColorBlock
            key={c.id}
            variant={c.color ? "custom" : "dark"}
            color={c.color}
            label={c.name}
            amount={c.monthly_budget ?? 0}
          />
        ))}
      </FullBleed>

      {categories.length === 0 && (
        <p className="mt-4 text-sm text-ink-soft">
          Your default categories will appear here after first login.
        </p>
      )}
    </div>
  );
}
