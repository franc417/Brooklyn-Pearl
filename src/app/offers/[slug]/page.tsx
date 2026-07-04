import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared-ui";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { describeCriteria } from "@/lib/describeCriteria";

export const dynamic = "force-dynamic";

export default async function OfferDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = createServiceRoleClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: offer } = await supabase
    .from("offers")
    .select("id, title, description, qualifying_criteria, price_kes, reward_description, starts_at, expires_at, image_url")
    .eq("slug", slug)
    .eq("is_active", true)
    .lte("starts_at", today)
    .gte("expires_at", today)
    .maybeSingle();

  if (!offer) notFound();

  const qualifiers = describeCriteria(offer.qualifying_criteria ?? {});

  return (
    <main style={{ fontFamily: "'Montserrat', sans-serif", minHeight: "100vh", background: "#f8f4ee" }}>
      <PageHeader title={offer.title} tagline="Offer details" />

      <section style={{ maxWidth: 640, margin: "0 auto", padding: "2.5rem 1.5rem" }}>
        <div
          style={{
            height: 220,
            marginBottom: "1.8rem",
            background: offer.image_url ? `url(${offer.image_url}) center/cover` : "linear-gradient(135deg, #a47f50, #292f1a)",
          }}
        />

        <div style={{ background: "#fff", border: "1px solid #eee", padding: "1.8rem" }}>
          <Row label="What it is" value={offer.description} />
          <Row label="Who qualifies" value={qualifiers.join(" · ")} />
          <Row label="Price" value={offer.price_kes ? `KES ${offer.price_kes.toLocaleString()}` : "No extra charge"} />
          <Row label="Reward" value={offer.reward_description} />
          <Row
            label="Available"
            value={`${new Date(offer.starts_at).toLocaleDateString("en-KE", { day: "numeric", month: "short" })} – ${new Date(offer.expires_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}`}
          />
          <p style={{ fontSize: "0.78rem", color: "#999", marginTop: "1.2rem" }}>
            This offer is honored in person when you book a qualifying stay or visit — mention it at the time of
            booking or when you arrive.
          </p>
        </div>
      </section>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <p style={{ fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#a47f50", marginBottom: "0.25rem" }}>
        {label}
      </p>
      <p style={{ fontSize: "0.9rem", color: "#292f1a" }}>{value}</p>
    </div>
  );
}
