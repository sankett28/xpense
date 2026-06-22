import { createClient } from "@/lib/supabase/server";
import type { ExpenseItem } from "@/lib/types";

export interface AddItemInput {
  category_id: string;
  name: string;
  icon?: string | null;
  default_amount?: number | null;
}

// Expense items ordered by pinned, then most-used, then most-recently-used
// (nulls last so never-used items sink below recently-used ones).
export async function listItems(): Promise<ExpenseItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expense_items")
    .select("*")
    .order("is_pinned", { ascending: false })
    .order("use_count", { ascending: false })
    .order("last_used_at", { ascending: false, nullsFirst: false });

  if (error) throw error;
  return (data ?? []) as ExpenseItem[];
}

export async function addItem(input: AddItemInput): Promise<ExpenseItem> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("expense_items")
    .insert({
      user_id: user.id,
      category_id: input.category_id,
      name: input.name,
      icon: input.icon ?? null,
      default_amount: input.default_amount ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as ExpenseItem;
}
