import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = createServiceRoleClient();

  const { data: event, error } = await supabase
    .from("events")
    .select("id, name, slug, description, event_date, start_time, end_time, price_kes, capacity, image_url, is_featured")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (error || !event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  let spotsLeft: number | null = null;
  if (event.capacity !== null) {
    const { data: bookings } = await supabase
      .from("event_bookings")
      .select("quantity")
      .eq("event_id", event.id)
      .in("status", ["pending_payment", "confirmed"]);
    const booked = (bookings ?? []).reduce((sum, b) => sum + b.quantity, 0);
    spotsLeft = event.capacity - booked;
  }

  return NextResponse.json({ ...event, spotsLeft });
}
