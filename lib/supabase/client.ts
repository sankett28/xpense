import { createBrowserClient } from "@supabase/ssr";

// Browser (client-component) Supabase client. Safe to call repeatedly;
// createBrowserClient returns a singleton-friendly client bound to the anon key.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
