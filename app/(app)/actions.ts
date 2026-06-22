"use server";

import { revalidatePath } from "next/cache";
import { addTransaction } from "@/lib/queries/transactions";
import { addCredit } from "@/lib/queries/credits";
import { addItem } from "@/lib/queries/items";
import type { CreditKind } from "@/lib/types";

// Log an expense from the quick-log fast-entry sheet. The DB trigger bumps the
// item's use_count/last_used_at automatically, so frequent items float up.
export async function logExpense(input: {
  itemId?: string | null;
  categoryId: string;
  amount: number;
  note?: string | null;
}) {
  if (!input.categoryId) throw new Error("A category is required");
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error("Amount must be greater than zero");
  }

  await addTransaction({
    item_id: input.itemId ?? null,
    category_id: input.categoryId,
    amount: input.amount,
    note: input.note ?? null,
  });

  // Refresh the home hero (available balance) and any cycle-aware screens.
  revalidatePath("/");
  revalidatePath("/dashboard");
}

// Create a new reusable quick-log item, then immediately log an expense with it.
// Used by the "add new item" path in the fast-entry sheet.
export async function createItemAndLog(input: {
  categoryId: string;
  name: string;
  icon?: string | null;
  amount: number;
  note?: string | null;
}) {
  const item = await addItem({
    category_id: input.categoryId,
    name: input.name,
    icon: input.icon ?? null,
    default_amount: input.amount,
  });

  await logExpense({
    itemId: item.id,
    categoryId: input.categoryId,
    amount: input.amount,
    note: input.note ?? null,
  });
}

// Log any credit (salary anchors a new cycle; other kinds are inflow only).
export async function logCredit(input: {
  amount: number;
  kind: CreditKind;
  source?: string | null;
  creditedAt: string; // YYYY-MM-DD
  note?: string | null;
}) {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error("Amount must be greater than zero");
  }
  if (!input.creditedAt) throw new Error("A credit date is required");

  await addCredit({
    amount: input.amount,
    kind: input.kind,
    source: input.source ?? null,
    credited_at: input.creditedAt,
    note: input.note ?? null,
  });

  revalidatePath("/");
  revalidatePath("/credits");
  revalidatePath("/dashboard");
}
