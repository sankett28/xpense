import { createClient } from "@/lib/supabase/server";
import type { Category } from "@/lib/types";

export interface AddCategoryInput {
  name: string;
  icon?: string | null;
  color?: string | null;
  monthly_budget?: number | null;
  sort_order?: number;
}

// Non-archived categories, ordered by sort_order.
export async function listCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("is_archived", false)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Category[];
}

export async function addCategory(input: AddCategoryInput): Promise<Category> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("categories")
    .insert({
      user_id: user.id,
      name: input.name,
      icon: input.icon ?? null,
      color: input.color ?? null,
      monthly_budget: input.monthly_budget ?? null,
      sort_order: input.sort_order ?? 0,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as Category;
}
