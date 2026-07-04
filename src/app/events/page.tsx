import Link from "next/link";
import { PageHeader } from "@/components/shared-ui";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const supabase = createServiceRoleClient();
  const { data: events } = await supabase
    .from("events")
    .select("id, name, slug, description, event_date, start_time, price_kes, image_url")
    .eq("is_published", true)
    .gte("event_date", new Date().toISOString().split("T")[0])
    .order("event_date", { ascending: true });

  return (
    <main style={{ fontFamily: "'Montserrat', sans-serif", minHeight: "100vh", background: "#f8f4ee" }}>
      <PageHeader title="Events" tagline="What's happening at Brooklyn Pearl" />

      <section style={{ maxWidth: 900, margin: "0 auto", padding: "2.5rem 1.5rem" }}>
        {(!events || events.length === 0) && (
          <p style={{ color: "#999", textAlign: "center" }}>No upcoming events right now — check back soon.</p>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1.2rem" }}>
          {(events ?? []).map((event) => (
            // The image is the entry point into the full detail + booking
            // flow, per the brief's "click image -> detail -> book" pattern.
            <Link
              key={event.id}
              href={`/events/${event.slug}`}
              style={{ textDecoration: "none", color: "inherit", background: "#fff", border: "1px solid #eee", display: "block" }}
            >
              <div
                style={{
                  height: 160,
                  background: event.image_url ? `url(${event.image_url}) center/cover` : "linear-gradient(135deg, #292f1a, #a47f50)",
                }}
              />
              <div style={{ padding: "1.1rem" }}>
                <p style={{ fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#a47f50", marginBottom: "0.4rem" }}>
                  {new Date(event.event_date).toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short" })}
                  {event.start_time ? ` · ${event.start_time}` : ""}
                </p>
                <p style={{ fontWeight: 500, marginBottom: "0.3rem" }}>{event.name}</p>
                <p style={{ fontSize: "0.82rem", color: "#999" }}>
                  {event.price_kes ? `KES ${event.price_kes.toLocaleString()}` : "Free"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
