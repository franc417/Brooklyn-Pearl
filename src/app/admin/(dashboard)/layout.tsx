import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import SignOutButton from "./sign-out-button";

// middleware.ts already blocks unauthenticated/non-staff requests before
// they reach here — this fetch is just to display the staff member's name,
// not the security boundary itself.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const { data: profile } = await supabase
    .from("staff_profiles")
    .select("name, role")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Montserrat', sans-serif" }}>
      <aside
        style={{
          width: 220,
          background: "#292f1a",
          color: "#fff",
          padding: "2rem 1.5rem",
          flexShrink: 0,
        }}
      >
        <p style={{ fontSize: "0.55rem", letterSpacing: "0.25em", textTransform: "uppercase", color: "#c4a06e", marginBottom: "0.3rem" }}>
          Brooklyn Pearl
        </p>
        <p style={{ fontSize: "0.9rem", marginBottom: "2rem" }}>{profile?.name ?? user.email}</p>

        <nav style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
          <Link href="/admin" style={navLinkStyle}>Overview</Link>
          <Link href="/admin/activity" style={navLinkStyle}>All Activity</Link>
          <Link href="/admin/bookings" style={navLinkStyle}>Hotel Bookings</Link>
          <Link href="/admin/enquiries" style={navLinkStyle}>Enquiries</Link>
          <Link href="/admin/verify-ticket" style={navLinkStyle}>Verify Ticket</Link>
        </nav>

        <div style={{ marginTop: "3rem" }}>
          <SignOutButton />
        </div>
      </aside>
      <main style={{ flex: 1, background: "#f8f4ee", padding: "2.5rem" }}>{children}</main>
    </div>
  );
}

const navLinkStyle: React.CSSProperties = {
  color: "rgba(255,255,255,0.8)",
  textDecoration: "none",
  fontSize: "0.78rem",
  letterSpacing: "0.05em",
};
