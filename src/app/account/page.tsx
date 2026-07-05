import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared-ui";
import SignOutButton from "./sign-out-button";

const SERVICE_LABELS: Record<string, string> = {
  hotel: "Hotel Stays",
  bnb: "BnB Stays",
  swimming: "Swimming",
  restaurant: "Restaurant",
};

export default async function AccountPage() {
  // Uses the session-aware client, not the service role -- RLS itself
  // scopes this to the logged-in guest's own rows (see migration 002's
  // "Guests can view their own loyalty counters" policy), so there's no
  // need to manually filter by user id here.
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/account/login");

  const { data: profile } = await supabase.from("guests").select("first_name").eq("id", user.id).maybeSingle();
  const { data: counters } = await supabase
    .from("loyalty_counters")
    .select("service_category, paid_count, free_rewards_granted");

  return (
    <main style={{ fontFamily: "'Montserrat', sans-serif", minHeight: "100vh", background: "#f8f4ee" }}>
      <PageHeader title={`Welcome back${profile?.first_name ? `, ${profile.first_name}` : ""}`} tagline="Your loyalty status" />

      <section style={{ maxWidth: 640, margin: "0 auto", padding: "2.5rem 1.5rem" }}>
        {(!counters || counters.length === 0) && (
          <p style={{ color: "#999", textAlign: "center", marginBottom: "1.5rem" }}>
            No stays tracked yet — book a hotel room, swim session, or table to start earning rewards.
          </p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem", marginBottom: "2rem" }}>
          {(counters ?? []).map((c) => {
            const progress = c.paid_count % 10;
            const eligible = Math.floor(c.paid_count / 10) > c.free_rewards_granted;
            return (
              <div key={c.service_category} style={{ background: "#fff", border: "1px solid #eee", padding: "1.4rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
                  <p style={{ fontWeight: 500 }}>{SERVICE_LABELS[c.service_category] ?? c.service_category}</p>
                  {eligible && (
                    <span style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#2f6b3a", fontWeight: 600 }}>
                      Free stay ready 🎉
                    </span>
                  )}
                </div>
                <p style={{ fontSize: "0.82rem", color: "#999" }}>
                  {c.paid_count} paid total · {progress}/10 toward your next free reward · {c.free_rewards_granted} redeemed so far
                </p>
              </div>
            );
          })}
        </div>

        <SignOutButton />
      </section>
    </main>
  );
}
