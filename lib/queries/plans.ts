import { createClient } from "@/lib/supabase/server";
import type { Plan, PlanWithAllowances } from "@/lib/types";

export interface SavePlanInput {
  id?: string | null; // present = update; absent = create new
  name: string;
  salary: number;
  buffer: number;
  makeActive?: boolean;
  allowances: Array<{ categoryId: string; amount: number }>;
}

async function userIdOrThrow() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

// Idempotent: ensures the user has at least one (active) plan.
export async function ensureDefaultPlan(): Promise<void> {
  const { supabase, userId } = await userIdOrThrow();
  const { error } = await supabase.rpc("seed_default_plan", { p_user_id: userId });
  if (error) throw error;
}

export async function listPlans(): Promise<Plan[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plans")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Plan[];
}

export async function getActivePlan(): Promise<PlanWithAllowances | null> {
  const supabase = await createClient();
  const { data: plan, error } = await supabase
    .from("plans")
    .select("*")
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  if (!plan) return null;

  const { data: rows, error: aErr } = await supabase
    .from("plan_allowances")
    .select("*, category:categories(*)")
    .eq("plan_id", (plan as Plan).id);
  if (aErr) throw aErr;

  return {
    ...(plan as Plan),
    allowances: (rows ?? []) as PlanWithAllowances["allowances"],
  };
}

export async function activatePlan(planId: string): Promise<void> {
  const { supabase, userId } = await userIdOrThrow();
  // Two-statement approach: set all plans for this user to is_active=false, then
  // set the target plan to is_active=true. This relies on sequential execution
  // within one server request. The transient all-false state between the two
  // statements is acceptable for a single-user app without concurrent plan switches.
  const { error: offErr } = await supabase
    .from("plans")
    .update({ is_active: false })
    .eq("user_id", userId);
  if (offErr) throw offErr;
  const { error: onErr } = await supabase
    .from("plans")
    .update({ is_active: true })
    .eq("id", planId);
  if (onErr) throw onErr;
}

export async function savePlan(input: SavePlanInput): Promise<PlanWithAllowances> {
  const { supabase, userId } = await userIdOrThrow();

  let planId = input.id ?? null;
  if (planId) {
    const { error } = await supabase
      .from("plans")
      .update({ name: input.name, salary: input.salary, buffer: input.buffer, updated_at: new Date().toISOString() })
      .eq("id", planId);
    if (error) throw error;
  } else {
    const { data, error } = await supabase
      .from("plans")
      .insert({ user_id: userId, name: input.name, salary: input.salary, buffer: input.buffer, is_active: false })
      .select("id")
      .single();
    if (error) throw error;
    planId = (data as { id: string }).id;
  }

  if (!planId) throw new Error("Could not resolve plan id");

  // Replace allowances wholesale (simple + correct for an authored document).
  const { error: delErr } = await supabase.from("plan_allowances").delete().eq("plan_id", planId);
  if (delErr) throw delErr;
  if (input.allowances.length) {
    const { error: insErr } = await supabase.from("plan_allowances").insert(
      input.allowances.map((a) => ({ plan_id: planId, category_id: a.categoryId, amount: a.amount })),
    );
    if (insErr) throw insErr;
  }

  if (input.makeActive) await activatePlan(planId);

  const active = await getActivePlanById(planId);
  return active;
}

async function getActivePlanById(planId: string): Promise<PlanWithAllowances> {
  const supabase = await createClient();
  const { data: plan, error } = await supabase.from("plans").select("*").eq("id", planId).single();
  if (error) throw error;
  const { data: rows, error: aErr } = await supabase
    .from("plan_allowances")
    .select("*, category:categories(*)")
    .eq("plan_id", planId);
  if (aErr) throw aErr;
  return { ...(plan as Plan), allowances: (rows ?? []) as PlanWithAllowances["allowances"] };
}

// Fetch any plan by id with its allowances joined to categories. Null if absent.
export async function getPlanById(id: string): Promise<PlanWithAllowances | null> {
  const supabase = await createClient();
  const { data: plan, error } = await supabase
    .from("plans")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!plan) return null;
  const { data: rows, error: aErr } = await supabase
    .from("plan_allowances")
    .select("*, category:categories(*)")
    .eq("plan_id", id);
  if (aErr) throw aErr;
  return { ...(plan as Plan), allowances: (rows ?? []) as PlanWithAllowances["allowances"] };
}

// Delete a plan. Refuses to delete the active plan (it's live).
export async function deletePlan(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: plan, error: gErr } = await supabase
    .from("plans")
    .select("is_active")
    .eq("id", id)
    .maybeSingle();
  if (gErr) throw gErr;
  if (!plan) return;
  if ((plan as { is_active: boolean }).is_active) {
    throw new Error("Can't delete the active plan. Activate another plan first.");
  }
  const { error } = await supabase.from("plans").delete().eq("id", id);
  if (error) throw error;
}

// Clone a plan (and its allowances) as a new inactive plan named "<name> copy".
export async function duplicatePlan(id: string): Promise<Plan> {
  const { supabase, userId } = await userIdOrThrow();
  const source = await getPlanById(id);
  if (!source) throw new Error("Plan not found");

  const { data: created, error } = await supabase
    .from("plans")
    .insert({
      user_id: userId,
      name: `${source.name} copy`,
      salary: source.salary,
      buffer: source.buffer,
      is_active: false,
    })
    .select("*")
    .single();
  if (error) throw error;
  const newPlan = created as Plan;

  if (source.allowances.length) {
    const { error: insErr } = await supabase.from("plan_allowances").insert(
      source.allowances.map((a) => ({
        plan_id: newPlan.id,
        category_id: a.category_id,
        amount: a.amount,
      })),
    );
    if (insErr) throw insErr;
  }
  return newPlan;
}
