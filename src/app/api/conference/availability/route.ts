import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { conferenceAvailabilityQuerySchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const parsed = conferenceAvailabilityQuerySchema.safeParse({
    date: searchParams.get("date"),
    startTime: searchParams.get("startTime"),
    durationHours: searchParams.get("durationHours") ?? undefined,
    attendeeCount: searchParams.get("attendeeCount") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { date, startTime, durationHours, attendeeCount } = parsed.data;

  const start = new Date(`${date}T${startTime}:00`);
  const end = new Date(start.getTime() + durationHours * 60 * 60_000);

  const supabase = createServiceRoleClient();

  const { data: rooms, error } = await supabase
    .from("conference_rooms")
    .select("id, name, capacity, hourly_rate_kes, amenities")
    .eq("is_published", true)
    .gte("capacity", attendeeCount);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!rooms || rooms.length === 0) {
    return NextResponse.json({ available: false, options: [] });
  }

  const roomIds = rooms.map((r) => r.id);
  const { data: overlapping } = await supabase
    .from("conference_bookings")
    .select("room_id")
    .in("room_id", roomIds)
    .in("status", ["pending_payment", "confirmed"])
    .lt("booking_start", end.toISOString())
    .gt("booking_end", start.toISOString());

  const bookedRoomIds = new Set((overlapping ?? []).map((b) => b.room_id));
  const options = rooms
    .filter((r) => !bookedRoomIds.has(r.id))
    .map((r) => ({
      roomId: r.id,
      name: r.name,
      capacity: r.capacity,
      amenities: r.amenities,
      totalKes: r.hourly_rate_kes * durationHours,
      bookingStart: start.toISOString(),
      bookingEnd: end.toISOString(),
    }));

  return NextResponse.json({ available: options.length > 0, options });
}
