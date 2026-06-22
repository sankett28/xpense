import { createBrowserClient } from "@supabase/ssr";

// Browser (client-component) Supabase client. Safe to call repeatedly;
// createBrowserClient returns a singleton-friendly client bound to the
// publishable (browser-safe) key — RLS protects the data.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
