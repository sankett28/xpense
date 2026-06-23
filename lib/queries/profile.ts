import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

// The current user's profile row, or null if not signed in.
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;
  return (data as Profile | null) ?? null;
}

// A friendly first name for greetings. Prefers the profile display name, then
// the email's local part, then a neutral fallback. Returns just the first word
// so "Welcome Pablo," reads naturally.
export async function getGreetingName(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "there";

  const { data } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  const display = (data as { display_name: string | null } | null)?.display_name;
  const fromEmail = user.email?.split("@")[0];
  const name = display?.trim() || fromEmail || "there";
  return name.split(/[\s.]+/)[0];
}

// The user's calendar cycle reset day (1..31). Defaults to 25 if unset.
export async function getCycleResetDay(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 25;
  const { data } = await supabase
    .from("profiles")
    .select("cycle_reset_day")
    .eq("id", user.id)
    .maybeSingle();
  const day = (data as { cycle_reset_day: number | null } | null)?.cycle_reset_day;
  return day ?? 25;
}

export async function setCycleResetDayValue(day: number): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const clamped = Math.min(31, Math.max(1, Math.round(day)));
  const { error } = await supabase
    .from("profiles")
    .update({ cycle_reset_day: clamped })
    .eq("id", user.id);
  if (error) throw error;
}
