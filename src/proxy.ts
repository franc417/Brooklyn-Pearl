import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Every request under /admin (except the login page itself) is checked here,
// before it ever reaches a page component. This is deliberate: a page-level
// check can be forgotten when someone adds a new admin page later; proxy.ts
// can't be, because it runs for every path under the matcher below.
// (Next.js 16 renamed "middleware.ts" to "proxy.ts" — same mechanism, new name.)
export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoginPage = request.nextUrl.pathname === "/admin/login";

  if (!user && !isLoginPage) {
    const loginUrl = new URL("/admin/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (user && !isLoginPage) {
    // Confirm this authenticated user is actually staff, not just any guest
    // who happens to have an account. See staff_profiles in supabase/schema.sql.
    const { data: staffProfile } = await supabase
      .from("staff_profiles")
      .select("id, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (!staffProfile || !staffProfile.is_active) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("error", "not_authorized");
      return NextResponse.redirect(loginUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
