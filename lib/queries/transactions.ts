import { createClient } from "@/lib/supabase/server";
import type { Transaction } from "@/lib/types";

export interface AddTransactionInput {
  item_id?: string | null;
  category_id: string;
  amount: number;
  note?: string | null;
  spent_at?: string; // timestamptz; defaults to now() in the DB
}

// Most recent transactions, newest first.
export async function listRecentTransactions(limit = 20): Promise<Transaction[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .order("spent_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as Transaction[];
}

// Insert a transaction. NOTE: we do NOT bump expense_items.use_count here — the
// trg_bump_item_usage DB trigger handles that automatically.
export async function addTransaction(
  input: AddTransactionInput,
): Promise<Transaction> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const row: Record<string, unknown> = {
    user_id: user.id,
    item_id: input.item_id ?? null,
    category_id: input.category_id,
    amount: input.amount,
    note: input.note ?? null,
  };
  // Only send spent_at when provided so the DB default (now()) applies otherwise.
  if (input.spent_at) row.spent_at = input.spent_at;

  const { data, error } = await supabase
    .from("transactions")
    .insert(row)
    .select("*")
    .single();

  if (error) throw error;
  return data as Transaction;
}
