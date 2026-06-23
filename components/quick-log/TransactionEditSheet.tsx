"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { formatINR } from "@/lib/utils/currency";
import { editExpense, removeExpense } from "@/app/(app)/actions";
import { toISODate } from "@/lib/utils/date";
import type { Category, Transaction } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  // Display name resolved by the caller (note carries the name).
  initialName: string;
  categories: Category[];
}

// Edit or delete an existing expense. Lets the user fix a typo'd amount, rename,
// recategorize, or change the date — the trust fundamentals.
export function TransactionEditSheet({
  open,
  onClose,
  transaction,
  initialName,
  categories,
}: Props) {
  return (
    <Sheet open={open} onClose={onClose} title="Edit expense">
      {transaction && (
        <EditForm
          key={transaction.id}
          transaction={transaction}
          initialName={initialName}
          categories={categories}
          onClose={onClose}
        />
      )}
    </Sheet>
  );
}

function EditForm({
  transaction,
  initialName,
  categories,
  onClose,
}: {
  transaction: Transaction;
  initialName: string;
  categories: Category[];
  onClose: () => void;
}) {
  const [amount, setAmount] = useState(String(transaction.amount));
  const [name, setName] = useState(initialName);
  const [categoryId, setCategoryId] = useState(transaction.category_id);
  const [spentAt, setSpentAt] = useState(
    toISODate(new Date(transaction.spent_at)),
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const numericAmount = Number(amount);
  const canSave =
    Number.isFinite(numericAmount) && numericAmount > 0 && name.trim() && categoryId;

  function handleSave() {
    if (!canSave) return;
    setError(null);
    startTransition(async () => {
      try {
        await editExpense({
          id: transaction.id,
          amount: numericAmount,
          categoryId,
          name: name.trim(),
          spentAt: new Date(spentAt + "T12:00:00").toISOString(),
        });
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save");
      }
    });
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      try {
        await removeExpense(transaction.id);
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not delete");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4 pb-2">
      <div className="text-center">
        <span className="label-caps">Amount</span>
        <div className="font-mono text-5xl font-semibold text-ink tabular-nums">
          {amount ? formatINR(numericAmount) : "₹0"}
        </div>
      </div>

      <label className="label-caps">Amount</label>
      <input
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
        className="-mt-3 w-full rounded-xl bg-surface-2 px-4 py-3 font-mono text-lg text-ink outline-none focus:ring-2 focus:ring-accent/40"
      />

      <div>
        <label className="label-caps">What for</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1.5 w-full rounded-xl bg-surface-2 px-4 py-3 text-ink outline-none focus:ring-2 focus:ring-accent/40"
        />
      </div>

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
                    ? "bg-pace-good text-canvas"
                    : "bg-surface-2 text-ink hover:bg-surface-2/70",
                ].join(" ")}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="label-caps">Date</label>
        <input
          type="date"
          value={spentAt}
          onChange={(e) => setSpentAt(e.target.value)}
          className="mt-1.5 w-full rounded-xl bg-surface-2 px-4 py-3 text-ink outline-none focus:ring-2 focus:ring-accent/40"
        />
      </div>

      {error && <p className="text-center text-sm text-alert">{error}</p>}

      <Button
        variant="primary"
        size="lg"
        disabled={!canSave || isPending}
        onClick={handleSave}
        className="w-full"
      >
        {isPending ? "Saving…" : "Save changes"}
      </Button>

      {/* Delete with a confirm step. */}
      {confirmDelete ? (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="md"
            className="flex-1"
            onClick={() => setConfirmDelete(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-alert px-4 py-3 text-on-dark disabled:opacity-50"
          >
            <Trash2 size={16} /> Delete for good
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          disabled={isPending}
          className="flex items-center justify-center gap-2 py-1 text-sm text-alert"
        >
          <Trash2 size={15} /> Delete expense
        </button>
      )}
    </div>
  );
}

export default TransactionEditSheet;
