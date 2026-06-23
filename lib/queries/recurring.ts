import { createClient } from "@/lib/supabase/server";
import type { RecurringExpense } from "@/lib/types";

export interface AddRecurringInput {
  category_id: string;
  name: string;
  amount: number;
  day_of_month: number;
  start_date: string; // YYYY-MM-DD
  end_date?: string | null; // null = forever
}

export async function listRecurring(): Promise<RecurringExpense[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recurring_expenses")
    .select("*")
    .order("is_active", { ascending: false })
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as RecurringExpense[];
}

export async function addRecurring(
  input: AddRecurringInput,
): Promise<RecurringExpense> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("recurring_expenses")
    .insert({
      user_id: user.id,
      category_id: input.category_id,
      name: input.name,
      amount: input.amount,
      day_of_month: Math.min(28, Math.max(1, input.day_of_month)),
      start_date: input.start_date,
      end_date: input.end_date ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as RecurringExpense;
}

export interface UpdateRecurringInput {
  category_id?: string;
  name?: string;
  amount?: number;
  day_of_month?: number;
  end_date?: string | null;
  is_active?: boolean;
}

export async function updateRecurring(
  id: string,
  input: UpdateRecurringInput,
): Promise<RecurringExpense> {
  const supabase = await createClient();
  const patch: Record<string, unknown> = {};
  if (input.category_id !== undefined) patch.category_id = input.category_id;
  if (input.name !== undefined) patch.name = input.name;
  if (input.amount !== undefined) patch.amount = input.amount;
  if (input.day_of_month !== undefined)
    patch.day_of_month = Math.min(28, Math.max(1, input.day_of_month));
  if (input.end_date !== undefined) patch.end_date = input.end_date;
  if (input.is_active !== undefined) patch.is_active = input.is_active;

  const { data, error } = await supabase
    .from("recurring_expenses")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as RecurringExpense;
}

export async function deleteRecurring(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("recurring_expenses").delete().eq("id", id);
  if (error) throw error;
}

// Materialize all due recurring charges for the current user (idempotent). Call
// this on app load so recurring expenses appear without any background job.
export async function runMaterialize(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;
  const { data, error } = await supabase.rpc("materialize_recurring", {
    p_user_id: user.id,
  });
  if (error) throw error;
  return (data as number) ?? 0;
}
