"use client";

import { useState, useTransition } from "react";
import { Plus, Check } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { NumericKeypad } from "@/components/ui/NumericKeypad";
import { Button } from "@/components/ui/Button";
import { formatINR } from "@/lib/utils/currency";
import { logEntry } from "@/app/(app)/actions";
import type { Category, ExpenseItem } from "@/lib/types";

export interface FastEntryTarget {
  // Existing item being repeated, or null when logging something new.
  item: ExpenseItem | null;
  // Pre-selected category (e.g. the repeated item's category).
  category: Category | null;
}

interface FastEntrySheetProps {
  open: boolean;
  onClose: () => void;
  target: FastEntryTarget | null;
  categories: Category[];
}

// The fast-entry sheet shell. The inner form is remounted (via `key`) whenever
// the target changes, so it initializes its state from props — no effect needed.
export function FastEntrySheet({
  open,
  onClose,
  target,
  categories,
}: FastEntrySheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title="Add expense">
      {target && (
        <FastEntryForm
          key={target.item?.id ?? "new"}
          target={target}
          categories={categories}
          onClose={onClose}
        />
      )}
    </Sheet>
  );
}

interface FastEntryFormProps {
  target: FastEntryTarget;
  categories: Category[];
  onClose: () => void;
}

// Sentinel category id meaning "create a new category from the typed name".
const NEW_CATEGORY = "__new__";

function FastEntryForm({ target, categories, onClose }: FastEntryFormProps) {
  const repeating = target.item != null;

  const [amount, setAmount] = useState(
    target.item?.default_amount != null ? String(target.item.default_amount) : "",
  );
  const [name, setName] = useState(target.item?.name ?? "");
  const [categoryId, setCategoryId] = useState<string>(
    target.category?.id ?? target.item?.category_id ?? categories[0]?.id ?? "",
  );
  const [newCategoryName, setNewCategoryName] = useState("");
  // Default to remembering new things; off when repeating an existing item.
  const [saveAsFrequent, setSaveAsFrequent] = useState(!repeating);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const numericAmount = Number(amount);
  const creatingCategory = categoryId === NEW_CATEGORY;

  const canSave =
    Number.isFinite(numericAmount) &&
    numericAmount > 0 &&
    name.trim().length > 0 &&
    (creatingCategory ? newCategoryName.trim().length > 0 : !!categoryId);

  function handleSave() {
    if (!canSave) return;
    setError(null);
    startTransition(async () => {
      try {
        await logEntry({
          amount: numericAmount,
          name: name.trim(),
          categoryId: creatingCategory ? null : categoryId,
          newCategoryName: creatingCategory ? newCategoryName.trim() : null,
          itemId: repeating ? target.item!.id : null,
          saveAsFrequent: repeating ? false : saveAsFrequent,
        });
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save expense");
      }
    });
  }

  return (
    <div className="flex flex-col gap-5 pb-2">
      {/* Live amount. */}
      <div className="text-center">
        <span className="label-caps">Amount</span>
        <div className="font-mono text-6xl font-semibold text-ink tabular-nums">
          {amount ? formatINR(numericAmount) : "₹0"}
        </div>
      </div>

      {/* What was it? (the name) */}
      <div>
        <label className="label-caps">What for</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder=""
          className="mt-1.5 w-full rounded-xl bg-surface-2 px-4 py-3.5 text-lg text-ink placeholder:text-ink-soft/60 outline-none focus:ring-2 focus:ring-accent/40"
        />
      </div>

      {/* Category: pick existing or create new. */}
      <div>
        <label className="label-caps">Category</label>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {categories.map((c) => {
            const active = c.id === categoryId;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoryId(c.id)}
                className={[
                  "rounded-full px-4 py-2 text-sm transition-colors",
                  active
                    ? "bg-ink text-on-dark"
                    : "bg-surface-2 text-ink-soft hover:text-ink",
                ].join(" ")}
              >
                {c.name}
              </button>
            );
          })}
          {/* New category chip. */}
          <button
            type="button"
            onClick={() => setCategoryId(NEW_CATEGORY)}
            className={[
              "flex items-center gap-1 rounded-full px-4 py-2 text-sm transition-colors",
              creatingCategory
                ? "bg-accent text-on-dark"
                : "bg-surface-2 text-ink-soft hover:text-ink",
            ].join(" ")}
          >
            <Plus size={14} /> New
          </button>
        </div>

        {creatingCategory && (
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="New category name"
            autoFocus
            className="mt-2 w-full rounded-xl bg-surface-2 px-4 py-3 text-ink placeholder:text-ink-soft/60 outline-none focus:ring-2 focus:ring-accent/40"
          />
        )}
      </div>

      {/* Remember as a frequent item (only when not repeating one). */}
      {!repeating && (
        <button
          type="button"
          onClick={() => setSaveAsFrequent((v) => !v)}
          className="flex items-center gap-3 text-left"
        >
          <span
            className={[
              "grid h-6 w-6 place-items-center rounded-md border transition-colors",
              saveAsFrequent
                ? "border-accent bg-accent text-on-dark"
                : "border-ink-soft/40 text-transparent",
            ].join(" ")}
          >
            <Check size={15} />
          </span>
          <span className="text-sm text-ink">
            Remember as a frequent item
          </span>
        </button>
      )}

      <NumericKeypad value={amount} onChange={setAmount} />

      {error && <p className="text-center text-sm text-alert">{error}</p>}

      <Button
        variant="primary"
        size="lg"
        disabled={!canSave || isPending}
        onClick={handleSave}
        className="w-full"
      >
        {isPending ? "Saving…" : "Save expense"}
      </Button>
    </div>
  );
}

export default FastEntrySheet;
