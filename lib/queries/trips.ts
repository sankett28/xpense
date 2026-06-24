import { createClient } from "@/lib/supabase/server";
import { todayISO, daysBetween } from "@/lib/utils/date";
import type { Trip, TripWithSpend } from "@/lib/types";

async function userIdOrThrow() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

export async function getActiveTrip(): Promise<Trip | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  return (data as Trip | null) ?? null;
}

export async function listTrips(): Promise<Trip[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Trip[];
}

export async function startTrip(input: {
  name: string;
  startDate?: string | null;
  endDate?: string | null;
}): Promise<Trip> {
  const { supabase, userId } = await userIdOrThrow();
  const { data, error } = await supabase
    .from("trips")
    .insert({
      user_id: userId,
      name: input.name,
      start_date: input.startDate ?? todayISO(),
      end_date: input.endDate ?? null,
      is_active: true,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as Trip;
}

// End the trip: mark inactive, and stamp end_date with today when it was blank
// so history shows a real range.
export async function endTrip(id: string): Promise<void> {
  const { supabase, userId } = await userIdOrThrow();
  const { data: trip, error: gErr } = await supabase
    .from("trips")
    .select("end_date")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (gErr) throw gErr;
  const endDate = (trip as { end_date: string | null } | null)?.end_date ?? todayISO();
  const { error } = await supabase
    .from("trips")
    .update({ is_active: false, end_date: endDate })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

// The active trip plus its running total and per-category breakdown.
export async function getActiveTripWithSpend(): Promise<TripWithSpend | null> {
  const trip = await getActiveTrip();
  if (!trip) return null;

  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("transactions")
    .select("amount, category_id, category:categories(name, icon)")
    .eq("trip_id", trip.id);
  if (error) throw error;

  let total = 0;
  const map = new Map<string, { name: string; icon: string | null; spent: number }>();
  for (const r of rows ?? []) {
    const amount = Number((r as { amount: number }).amount);
    total += amount;
    const id = (r as { category_id: string }).category_id;
    const cat = ((r as unknown) as { category: { name: string; icon: string | null } | null }).category;
    const prev = map.get(id);
    if (prev) prev.spent += amount;
    else map.set(id, { name: cat?.name ?? "Other", icon: cat?.icon ?? null, spent: amount });
  }

  const byCategory = Array.from(map.entries())
    .map(([categoryId, v]) => ({ categoryId, name: v.name, icon: v.icon, spent: v.spent }))
    .sort((a, b) => b.spent - a.spent);

  const anchor = trip.start_date ?? trip.created_at.slice(0, 10);
  const dayNumber = Math.max(1, daysBetween(anchor, todayISO()) + 1);

  return { ...trip, total, byCategory, dayNumber };
}
