"use client";

import { useState } from "react";
import { TransactionRow } from "@/components/ui/TransactionRow";
import { TransactionEditSheet } from "@/components/quick-log/TransactionEditSheet";
import type { Category, Transaction } from "@/lib/types";

interface HistoryListProps {
  transactions: Transaction[];
  categories: Category[];
  itemNames: Record<string, string>;
  itemIcons: Record<string, string | null>;
}

// Renders the transaction list and owns the edit/delete sheet. Tapping a row
// opens it for editing.
export function HistoryList({
  transactions,
  categories,
  itemNames,
  itemIcons,
}: HistoryListProps) {
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [open, setOpen] = useState(false);

  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const catIcon = new Map(categories.map((c) => [c.id, c.icon]));
  const catColor = new Map(categories.map((c) => [c.id, c.color]));

  // The expense name lives in the note; fall back to the item name.
  function displayName(t: Transaction): string {
    if (t.note?.trim()) return t.note.split(" · ")[0];
    if (t.item_id && itemNames[t.item_id]) return itemNames[t.item_id];
    return "Expense";
  }

  function openEdit(t: Transaction) {
    setEditing(t);
    setOpen(true);
  }

  if (transactions.length === 0) {
    return (
      <p className="mt-6 text-sm text-ink-soft">
        No expenses match. Try clearing the filters.
      </p>
    );
  }

  return (
    <>
      <div className="mt-2 flex flex-col divide-y divide-ink-soft/15">
        {transactions.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => openEdit(t)}
            className="text-left active:opacity-70"
          >
            <TransactionRow
              transaction={t}
              icon={
                (t.item_id ? itemIcons[t.item_id] : null) ??
                catIcon.get(t.category_id) ??
                undefined
              }
              itemName={displayName(t)}
              categoryName={catName.get(t.category_id) ?? ""}
              accentColor={catColor.get(t.category_id)}
            />
          </button>
        ))}
      </div>

      <TransactionEditSheet
        open={open}
        onClose={() => setOpen(false)}
        transaction={editing}
        initialName={editing ? displayName(editing) : ""}
        categories={categories}
      />
    </>
  );
}

export default HistoryList;
