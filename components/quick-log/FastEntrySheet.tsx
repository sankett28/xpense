"use client";

import { useState, useTransition } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { NumericKeypad } from "@/components/ui/NumericKeypad";
import { Button } from "@/components/ui/Button";
import { IconTile } from "@/components/ui/IconTile";
import { formatINR } from "@/lib/utils/currency";
import { logExpense, createItemAndLog } from "@/app/(app)/actions";
import type { Category, ExpenseItem } from "@/lib/types";

export interface FastEntryTarget {
  // Existing item being logged, or null when logging a brand-new item.
  item: ExpenseItem | null;
  // The category to file the expense under (required either way).
  category: Category | null;
  // For the "new item" path: the name typed by the user.
  newItemName?: string;
}

interface FastEntrySheetProps {
  open: boolean;
  onClose: () => void;
  target: FastEntryTarget | null;
  categories: Category[];
}

// The fast-entry sheet shell. The inner form is remounted (via `key`) whenever
// the target changes, so it initializes its state from props directly — no
// state-syncing effect needed.
export function FastEntrySheet({
  open,
  onClose,
  target,
  categories,
}: FastEntrySheetProps) {
  const title = target?.item
    ? target.item.name
    : target?.newItemName
      ? target.newItemName
      : "New expense";

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {target && (
        <FastEntryForm
          key={target.item?.id ?? target.newItemName ?? "new"}
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

function FastEntryForm({ target, categories, onClose }: FastEntryFormProps) {
  const [amount, setAmount] = useState(
    target.item?.default_amount != null ? String(target.item.default_amount) : "",
  );
  const [note, setNote] = useState("");
  const [categoryId, setCategoryId] = useState<string>(
    target.category?.id ?? target.item?.category_id ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const numericAmount = Number(amount);
  const canSave =
    Number.isFinite(numericAmount) && numericAmount > 0 && !!categoryId;

  function handleSave() {
    if (!canSave) return;
    setError(null);
    startTransition(async () => {
      try {
        if (target.item) {
          await logExpense({
            itemId: target.item.id,
            categoryId,
            amount: numericAmount,
            note: note.trim() || null,
          });
        } else {
          // New item path: create the reusable item, then log it.
          await createItemAndLog({
            categoryId,
            name: (target.newItemName ?? "Expense").trim() || "Expense",
            icon: target.category?.icon ?? null,
            amount: numericAmount,
            note: note.trim() || null,
          });
        }
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save expense");
      }
    });
  }

  return (
      <div className="flex flex-col gap-4">
        {/* Live amount display. */}
        <div className="text-center">
          <span className="label-caps">Amount</span>
          <div className="font-mono text-5xl text-ink tabular-nums">
            {amount ? formatINR(numericAmount) : "₹0"}
          </div>
        </div>

        {/* Category selector — pre-filled, but changeable. */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map((c) => {
            const active = c.id === categoryId;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoryId(c.id)}
                className={[
                  "flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-sm",
                  active
                    ? "bg-dark text-on-dark"
                    : "bg-surface-2 text-ink-soft",
                ].join(" ")}
              >
                <IconTile icon={c.icon ?? undefined} size="sm" />
                {c.name}
              </button>
            );
          })}
        </div>

        {/* Optional note. */}
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optional)"
          className="w-full rounded-xl bg-surface-2 px-4 py-3 text-ink placeholder:text-ink-soft/60 outline-none"
        />

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
