import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { restaurantAvailabilityQuerySchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const parsed = restaurantAvailabilityQuerySchema.safeParse({
    date: searchParams.get("date"),
    time: searchParams.get("time"),
    partySize: searchParams.get("partySize") ?? undefined,
    durationMinutes: searchParams.get("durationMinutes") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { date, time, partySize, durationMinutes } = parsed.data;

  const start = new Date(`${date}T${time}:00`);
  const end = new Date(start.getTime() + durationMinutes * 60_000);

  const supabase = createServiceRoleClient();

  const { data: tables, error } = await supabase
    .from("restaurant_tables")
    .select("id, table_number, seats")
    .eq("status", "available")
    .gte("seats", partySize);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!tables || tables.length === 0) {
    return NextResponse.json({ available: false, options: [] });
  }

  const tableIds = tables.map((t) => t.id);
  const { data: overlapping } = await supabase
    .from("restaurant_reservations")
    .select("table_id")
    .in("table_id", tableIds)
    .in("status", ["pending_payment", "confirmed"])
    .lt("reservation_start", end.toISOString())
    .gt("reservation_end", start.toISOString());

  const bookedTableIds = new Set((overlapping ?? []).map((r) => r.table_id));
  const options = tables
    .filter((t) => !bookedTableIds.has(t.id))
    .map((t) => ({
      tableId: t.id,
      tableNumber: t.table_number,
      seats: t.seats,
      reservationStart: start.toISOString(),
      reservationEnd: end.toISOString(),
    }));

  return NextResponse.json({ available: options.length > 0, options });
}
