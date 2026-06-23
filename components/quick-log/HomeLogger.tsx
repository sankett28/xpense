"use client";

import { useState } from "react";
import {
  FastEntrySheet,
  type FastEntryTarget,
} from "@/components/quick-log/FastEntrySheet";
import type { Category, ExpenseItem } from "@/lib/types";

interface HomeLoggerProps {
  categories: Category[];
  // A few frequent items, shown as one-tap shortcuts beneath the +.
  recentItems: ExpenseItem[];
}

// The Home logging hero: a large, confident + that owns the lower half of the
// screen and opens the fast-entry sheet. This is the signature element — the one
// place the design spends its boldness. Frequent items sit quietly below as
// one-tap repeats. See docs/design-system.md.
export function HomeLogger({ categories, recentItems }: HomeLoggerProps) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<FastEntryTarget | null>(null);

  const categoryById = new Map(categories.map((c) => [c.id, c]));

  function openForNew() {
    setTarget({ item: null, category: categories[0] ?? null });
    setOpen(true);
  }

  function openForItem(item: ExpenseItem) {
    setTarget({ item, category: categoryById.get(item.category_id) ?? null });
    setOpen(true);
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* The giant +. Generous target; quiet until pressed. */}
      <button
        type="button"
        onClick={openForNew}
        aria-label="Add new expense"
        className="group relative grid flex-1 place-items-center py-12 outline-none"
      >
        <span className="relative block transition-transform duration-150 ease-out group-hover:scale-[1.03] group-active:scale-95">
          {/* Drawn as two rules so it reads as a crisp, intentional cross. */}
          <span className="block h-36 w-36">
            <span className="absolute left-1/2 top-0 h-full w-[3px] -translate-x-1/2 rounded-full bg-ink" />
            <span className="absolute top-1/2 left-0 h-[3px] w-full -translate-y-1/2 rounded-full bg-ink" />
          </span>
        </span>
        <span className="label-caps mt-8 transition-colors group-hover:text-accent">
          Add new expense
        </span>
      </button>

      {/* Frequent items: one-tap repeats. Quiet, optional. */}
      {recentItems.length > 0 && (
        <div className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-2">
          {recentItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => openForItem(item)}
              className="shrink-0 rounded-full border border-ink/10 bg-surface px-4 py-2 text-sm text-ink active:scale-95"
            >
              {item.name}
            </button>
          ))}
        </div>
      )}

      <FastEntrySheet
        open={open}
        onClose={() => setOpen(false)}
        target={target}
        categories={categories}
      />
    </div>
  );
}

export default HomeLogger;
