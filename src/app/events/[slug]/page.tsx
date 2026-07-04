import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared-ui";
import { createServiceRoleClient } from "@/lib/supabase/server";
import EventBookingSection from "./booking-section";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = createServiceRoleClient();

  const { data: event } = await supabase
    .from("events")
    .select("id, name, slug, description, event_date, start_time, end_time, price_kes, capacity, image_url")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (!event) notFound();

  let spotsLeft: number | null = null;
  if (event.capacity !== null) {
    const { data: bookings } = await supabase
      .from("event_bookings")
      .select("quantity")
      .eq("event_id", event.id)
      .in("status", ["pending_payment", "confirmed"]);
    spotsLeft = event.capacity - (bookings ?? []).reduce((sum, b) => sum + b.quantity, 0);
  }

  return (
    <main style={{ fontFamily: "'Montserrat', sans-serif", minHeight: "100vh", background: "#f8f4ee" }}>
      <PageHeader title={event.name} tagline="Event details" />

      <section style={{ maxWidth: 640, margin: "0 auto", padding: "2.5rem 1.5rem" }}>
        <div
          style={{
            height: 260,
            marginBottom: "1.8rem",
            background: event.image_url ? `url(${event.image_url}) center/cover` : "linear-gradient(135deg, #292f1a, #a47f50)",
          }}
        />

        <p style={{ fontSize: "0.68rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#a47f50", marginBottom: "0.6rem" }}>
          {new Date(event.event_date).toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long" })}
          {event.start_time ? ` · ${event.start_time}${event.end_time ? `–${event.end_time}` : ""}` : ""}
        </p>

        {event.description && <p style={{ color: "#555", lineHeight: 1.7, marginBottom: "1.5rem" }}>{event.description}</p>}

        <EventBookingSection
          eventId={event.id}
          eventName={event.name}
          priceKes={event.price_kes}
          spotsLeft={spotsLeft}
        />
      </section>
    </main>
  );
}
