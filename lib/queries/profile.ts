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
