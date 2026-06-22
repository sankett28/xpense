"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface SignInState {
  error?: string;
}

// Email + password sign-in. On success, idempotently seeds the user's profile +
// default categories via the seed_new_user RPC, then redirects home. Returns a
// field-level error (instead of throwing) on bad credentials so the form can
// render it inline.
export async function signIn(
  _prevState: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return { error: "Incorrect email or password." };
  }

  // First login bootstrap (safe to call every time — fully idempotent).
  const { error: seedError } = await supabase.rpc("seed_new_user", {
    p_user_id: data.user.id,
  });
  if (seedError) {
    // Non-fatal: the user is authenticated. Surface a soft error so they know
    // setup may be incomplete, but still let them proceed on retry.
    return { error: "Signed in, but account setup failed. Please try again." };
  }

  redirect("/");
}

// Sign out and return to the login page.
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
