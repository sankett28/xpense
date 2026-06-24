import { createClient } from "@/lib/supabase/server";
import type { Transaction } from "@/lib/types";

export interface AddTransactionInput {
  item_id?: string | null;
  category_id: string;
  amount: number;
  note?: string | null;
  spent_at?: string; // timestamptz; defaults to now() in the DB
  trip_id?: string | null;
}

// Most recent transactions, newest first.
export async function listRecentTransactions(limit = 20): Promise<Transaction[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .is("trip_id", null)
    .order("spent_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as Transaction[];
}

export interface TransactionFilter {
  // Substring match on the transaction note (which carries the expense name).
  search?: string;
  categoryId?: string;
  // Inclusive YYYY-MM-DD bounds.
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

// Full transaction history with optional filters, newest first. Backs the
// searchable history screen. Returns rows + a total count for pagination.
export async function listTransactions(
  filter: TransactionFilter = {},
): Promise<{ rows: Transaction[]; count: number }> {
  const supabase = await createClient();
  const limit = filter.limit ?? 50;
  const offset = filter.offset ?? 0;

  let query = supabase
    .from("transactions")
    .select("*", { count: "exact" })
    .is("trip_id", null)
    .order("spent_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (filter.search?.trim()) {
    query = query.ilike("note", `%${filter.search.trim()}%`);
  }
  if (filter.categoryId) {
    query = query.eq("category_id", filter.categoryId);
  }
  if (filter.from) {
    query = query.gte("spent_at", filter.from);
  }
  if (filter.to) {
    // Half-open upper bound so the whole `to` day is included.
    query = query.lt("spent_at", addDays(filter.to, 1));
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: (data ?? []) as Transaction[], count: count ?? 0 };
}

export interface UpdateTransactionInput {
  amount?: number;
  category_id?: string;
  note?: string | null;
  spent_at?: string;
}

// Edit a transaction. RLS ensures only the owner's row can change.
export async function updateTransaction(
  id: string,
  input: UpdateTransactionInput,
): Promise<Transaction> {
  const supabase = await createClient();
  const patch: Record<string, unknown> = {};
  if (input.amount !== undefined) patch.amount = input.amount;
  if (input.category_id !== undefined) patch.category_id = input.category_id;
  if (input.note !== undefined) patch.note = input.note;
  if (input.spent_at !== undefined) patch.spent_at = input.spent_at;

  const { data, error } = await supabase
    .from("transactions")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as Transaction;
}

// Delete a transaction. RLS scopes it to the owner.
export async function deleteTransaction(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw error;
}

// Add `n` days to a YYYY-MM-DD string.
function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
  date.setUTCDate(date.getUTCDate() + n);
  const yy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
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
    recurring_id: null,
    trip_id: input.trip_id ?? null,
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
