"use server";

import { revalidatePath } from "next/cache";
import {
  addTransaction,
  updateTransaction,
  deleteTransaction,
} from "@/lib/queries/transactions";
import { addCredit } from "@/lib/queries/credits";
import { addItem } from "@/lib/queries/items";
import { addCategory } from "@/lib/queries/categories";
import {
  addRecurring,
  updateRecurring,
  deleteRecurring,
} from "@/lib/queries/recurring";
import { savePlan, activatePlan, ensureDefaultPlan } from "@/lib/queries/plans";
import { setCycleResetDayValue } from "@/lib/queries/profile";
import type { CreditKind } from "@/lib/types";

// Refresh every surface that reflects spend after a transaction changes.
function revalidateSpendSurfaces() {
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  revalidatePath("/history");
  revalidatePath("/categories");
}

// Edit an existing expense (amount, category, name/note, date).
export async function editExpense(input: {
  id: string;
  amount: number;
  categoryId: string;
  name: string;
  spentAt?: string;
}) {
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Enter an amount greater than zero");
  }
  const name = (input.name ?? "").trim();
  if (!name) throw new Error("Give the expense a name");
  if (!input.categoryId) throw new Error("Pick a category");

  await updateTransaction(input.id, {
    amount,
    category_id: input.categoryId,
    note: name,
    spent_at: input.spentAt,
  });
  revalidateSpendSurfaces();
}

// Delete an expense.
export async function removeExpense(id: string) {
  if (!id) throw new Error("Missing expense id");
  await deleteTransaction(id);
  revalidateSpendSurfaces();
}

// --- Recurring expenses ---

export async function createRecurring(input: {
  categoryId: string;
  name: string;
  amount: number;
  dayOfMonth: number;
  startDate: string;
  endDate?: string | null;
}) {
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0)
    throw new Error("Enter an amount greater than zero");
  if (!input.name.trim()) throw new Error("Give it a name");
  if (!input.categoryId) throw new Error("Pick a category");

  await addRecurring({
    category_id: input.categoryId,
    name: input.name.trim(),
    amount,
    day_of_month: input.dayOfMonth,
    start_date: input.startDate,
    end_date: input.endDate?.trim() ? input.endDate : null,
  });
  revalidatePath("/recurring");
  revalidateSpendSurfaces();
}

export async function editRecurring(input: {
  id: string;
  categoryId: string;
  name: string;
  amount: number;
  dayOfMonth: number;
  endDate?: string | null;
}) {
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0)
    throw new Error("Enter an amount greater than zero");

  await updateRecurring(input.id, {
    category_id: input.categoryId,
    name: input.name.trim(),
    amount,
    day_of_month: input.dayOfMonth,
    end_date: input.endDate?.trim() ? input.endDate : null,
  });
  revalidatePath("/recurring");
}

// Pause/resume (stops future materialization without deleting history).
export async function toggleRecurring(id: string, active: boolean) {
  await updateRecurring(id, { is_active: active });
  revalidatePath("/recurring");
}

export async function removeRecurring(id: string) {
  await deleteRecurring(id);
  revalidatePath("/recurring");
}

// The one logging action behind the + sheet. Handles everything in one call:
//   - pick an existing category OR create a new one by name
//   - the expense name (the "what")
//   - the amount
//   - optionally remember it as a frequent item for one-tap repeats
// Returns nothing; revalidates the surfaces that show spend.
export async function logEntry(input: {
  amount: number;
  name: string;
  // Provide exactly one: an existing category id, or a new category name.
  categoryId?: string | null;
  newCategoryName?: string | null;
  // Existing item being repeated (skips item creation), if any.
  itemId?: string | null;
  // Remember this name as a frequent item under the category.
  saveAsFrequent?: boolean;
  note?: string | null;
}) {
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Enter an amount greater than zero");
  }
  const name = (input.name ?? "").trim();
  if (!name) throw new Error("Give the expense a name");

  // Resolve the category: existing id, or create one from the typed name.
  let categoryId = input.categoryId ?? null;
  if (!categoryId) {
    const newName = (input.newCategoryName ?? "").trim();
    if (!newName) throw new Error("Pick or name a category");
    const category = await addCategory({ name: newName });
    categoryId = category.id;
  }

  // Resolve the item: repeat an existing one, or (optionally) remember a new one.
  let itemId = input.itemId ?? null;
  if (!itemId && input.saveAsFrequent) {
    const item = await addItem({
      category_id: categoryId,
      name,
      default_amount: amount,
    });
    itemId = item.id;
  }

  await addTransaction({
    item_id: itemId,
    category_id: categoryId,
    amount,
    note: name + (input.note?.trim() ? ` · ${input.note.trim()}` : ""),
  });

  revalidatePath("/");
  revalidatePath("/dashboard");
}

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

// Every surface whose numbers depend on the active plan.
function revalidatePlanSurfaces() {
  revalidatePath("/");
  revalidatePath("/plan");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
}

export async function savePlanAction(input: {
  id?: string | null;
  name: string;
  salary: number;
  buffer: number;
  makeActive?: boolean;
  allowances: Array<{ categoryId: string; amount: number }>;
}) {
  const name = (input.name ?? "").trim();
  if (!name) throw new Error("Give the plan a name");
  const salary = Number(input.salary);
  if (!Number.isFinite(salary) || salary < 0) throw new Error("Enter a valid salary");
  const buffer = Number(input.buffer);
  if (!Number.isFinite(buffer) || buffer < 0) throw new Error("Buffer can't be negative");

  await ensureDefaultPlan();
  await savePlan({
    id: input.id ?? null,
    name,
    salary,
    buffer,
    makeActive: input.makeActive ?? true,
    allowances: input.allowances
      .map((a) => ({ categoryId: a.categoryId, amount: Number(a.amount) || 0 }))
      .filter((a) => a.categoryId),
  });
  revalidatePlanSurfaces();
}

export async function activatePlanAction(planId: string) {
  if (!planId) throw new Error("Missing plan id");
  await activatePlan(planId);
  revalidatePlanSurfaces();
}

export async function setCycleResetDayAction(day: number) {
  const d = Number(day);
  if (!Number.isFinite(d) || d < 1 || d > 31) throw new Error("Pick a day between 1 and 31");
  await setCycleResetDayValue(d);
  revalidatePlanSurfaces();
}
