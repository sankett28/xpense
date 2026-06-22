import { createClient } from "@/lib/supabase/server";
import type { Credit, CreditKind } from "@/lib/types";

export interface AddCreditInput {
  amount: number;
  kind: CreditKind;
  source?: string | null;
  credited_at: string; // YYYY-MM-DD
  note?: string | null;
}

// All credits (any kind), newest first.
export async function listCredits(): Promise<Credit[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("credits")
    .select("*")
    .order("credited_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Credit[];
}

// Salary credits only (these anchor budget cycles), newest first.
export async function listSalaryCredits(): Promise<Credit[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("credits")
    .select("*")
    .eq("kind", "salary")
    .order("credited_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Credit[];
}

// Insert a credit for the authenticated user. user_id is set explicitly from the
// session; RLS additionally enforces it must equal auth.uid().
export async function addCredit(input: AddCreditInput): Promise<Credit> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("credits")
    .insert({
      user_id: user.id,
      amount: input.amount,
      kind: input.kind,
      source: input.source ?? null,
      credited_at: input.credited_at,
      note: input.note ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as Credit;
}
