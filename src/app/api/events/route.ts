import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

// Public endpoint. Same rows feed three UI surfaces per the project brief:
// this list (→ events page), the featured-event popup shown during other
// services' checkout, and the homepage ticker — via is_featured/is_published,
// so there's exactly one place event data lives.
export async function GET() {
  const supabase = createServiceRoleClient();

  const { data: events, error } = await supabase
    .from("events")
    .select("id, name, slug, description, event_date, start_time, end_time, price_kes, capacity, image_url, is_featured")
    .eq("is_published", true)
    .gte("event_date", new Date().toISOString().split("T")[0])
    .order("event_date", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!events || events.length === 0) {
    return NextResponse.json({ events: [] });
  }

  const eventIds = events.map((e) => e.id);
  const { data: bookings } = await supabase
    .from("event_bookings")
    .select("event_id, quantity")
    .in("event_id", eventIds)
    .in("status", ["pending_payment", "confirmed"]);

  const bookedByEvent = new Map<string, number>();
  for (const b of bookings ?? []) {
    bookedByEvent.set(b.event_id, (bookedByEvent.get(b.event_id) ?? 0) + b.quantity);
  }

  const withAvailability = events.map((e) => ({
    ...e,
    spotsLeft: e.capacity === null ? null : e.capacity - (bookedByEvent.get(e.id) ?? 0),
  }));

  return NextResponse.json({ events: withAvailability });
}
