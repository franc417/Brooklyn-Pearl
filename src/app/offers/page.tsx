import Link from "next/link";
import { PageHeader } from "@/components/shared-ui";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function OffersPage() {
  const supabase = createServiceRoleClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: offers } = await supabase
    .from("offers")
    .select("id, title, slug, reward_description, expires_at, image_url")
    .eq("is_active", true)
    .lte("starts_at", today)
    .gte("expires_at", today)
    .order("expires_at", { ascending: true });

  return (
    <main style={{ fontFamily: "'Montserrat', sans-serif", minHeight: "100vh", background: "#f8f4ee" }}>
      <PageHeader title="Offers" tagline="Current promotions at Brooklyn Pearl" />

      <section style={{ maxWidth: 900, margin: "0 auto", padding: "2.5rem 1.5rem" }}>
        {(!offers || offers.length === 0) && (
          <p style={{ color: "#999", textAlign: "center" }}>No active offers right now — check back soon.</p>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1.2rem" }}>
          {(offers ?? []).map((offer) => (
            <Link
              key={offer.id}
              href={`/offers/${offer.slug}`}
              style={{ textDecoration: "none", color: "inherit", background: "#fff", border: "1px solid #eee", display: "block" }}
            >
              <div
                style={{
                  height: 140,
                  background: offer.image_url ? `url(${offer.image_url}) center/cover` : "linear-gradient(135deg, #a47f50, #292f1a)",
                }}
              />
              <div style={{ padding: "1.1rem" }}>
                <p style={{ fontWeight: 500, marginBottom: "0.4rem" }}>{offer.title}</p>
                <p style={{ fontSize: "0.82rem", color: "#666", marginBottom: "0.5rem" }}>{offer.reward_description}</p>
                <p style={{ fontSize: "0.68rem", color: "#a47f50", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Ends {new Date(offer.expires_at).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
