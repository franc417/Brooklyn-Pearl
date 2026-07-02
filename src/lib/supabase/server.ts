import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createRawClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * Session-aware server client — use this in Server Components, Route Handlers,
 * and the admin dashboard. Respects the logged-in user's session and RLS
 * policies, same as the browser client, just usable on the server.
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — safe to ignore because
            // middleware.ts refreshes the session on every request instead.
          }
        },
      },
    }
  );
}

/**
 * Service-role client — BYPASSES Row Level Security entirely.
 * Only ever use this inside API routes / Route Handlers that run on the
 * server, for actions a guest's browser should never be able to do directly:
 * writing bookings, writing payments, reading across all guests' data for
 * the admin dashboard, etc. Never import this into a Client Component and
 * never send SUPABASE_SERVICE_ROLE_KEY to the browser.
 */
export function createServiceRoleClient() {
  return createRawClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
