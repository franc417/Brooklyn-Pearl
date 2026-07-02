import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser client — safe to use in Client Components.
 * Uses the public anon key, which is subject to Row Level Security policies
 * defined in supabase/schema.sql. It can never bypass those policies, which
 * is what keeps it safe to ship to the browser.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
