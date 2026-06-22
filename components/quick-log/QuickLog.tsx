"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { IconTile } from "@/components/ui/IconTile";
import { formatINR } from "@/lib/utils/currency";
import {
  FastEntrySheet,
  type FastEntryTarget,
} from "@/components/quick-log/FastEntrySheet";
import type { Category, ExpenseItem } from "@/lib/types";

interface QuickLogProps {
  items: ExpenseItem[];
  categories: Category[];
}

// The quick-log strip: tap a tile → fast-entry sheet. Items are pre-ordered by
// the server (pinned, then most-used, then most-recent) so frequent items float
// to the top. A "+" tile starts a brand-new expense.
export function QuickLog({ items, categories }: QuickLogProps) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<FastEntryTarget | null>(null);

  const categoryById = new Map(categories.map((c) => [c.id, c]));

  function openForItem(item: ExpenseItem) {
    setTarget({ item, category: categoryById.get(item.category_id) ?? null });
    setOpen(true);
  }

  function openForNew() {
    // Start with the first category selected; the user can change it in the sheet.
    setTarget({ item: null, category: categories[0] ?? null });
    setOpen(true);
  }

  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <span className="label-caps">Quick log</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => openForItem(item)}
            className="flex flex-col items-center gap-2 rounded-2xl bg-surface p-3 text-center active:brightness-95"
          >
            <IconTile icon={item.icon ?? undefined} size="md" />
            <span className="line-clamp-1 text-sm text-ink">{item.name}</span>
            {item.default_amount != null && (
              <span className="font-mono text-xs text-ink-soft">
                {formatINR(item.default_amount)}
              </span>
            )}
          </button>
        ))}

        {/* Add-new tile. */}
        <button
          type="button"
          onClick={openForNew}
          className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-accent p-3 text-center text-ink active:brightness-95"
        >
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-ink/10">
            <Plus size={22} />
          </span>
          <span className="text-sm font-medium">New</span>
        </button>
      </div>

      <FastEntrySheet
        open={open}
        onClose={() => setOpen(false)}
        target={target}
        categories={categories}
      />
    </section>
  );
}

export default QuickLog;
