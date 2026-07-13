import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { availabilityQuerySchema } from "@/lib/validation";

// Runs server-side with the service role client because answering
// "is anything free?" requires reading bookings across all guests, which the
// public anon key is deliberately not allowed to do (see schema.sql RLS
// policies). The response only ever reveals aggregate availability, never
// other guests' booking details.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const parsed = availabilityQuerySchema.safeParse({
    checkIn: searchParams.get("checkIn"),
    checkOut: searchParams.get("checkOut"),
    guests: searchParams.get("guests") ?? undefined,
    roomTypeSlug: searchParams.get("roomTypeSlug") ?? undefined,
    category: searchParams.get("category") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { checkIn, checkOut, guests, roomTypeSlug, category } = parsed.data;

  const supabase = createServiceRoleClient();

  let roomTypesQuery = supabase
    .from("room_types")
    .select("id, name, slug, base_price_kes, base_price_usd, capacity, cover_image_url, category")
    .eq("is_published", true)
    .gte("capacity", guests);

  if (roomTypeSlug && roomTypeSlug !== "any") {
    roomTypesQuery = roomTypesQuery.eq("slug", roomTypeSlug);
  }
  if (category) {
    roomTypesQuery = roomTypesQuery.eq("category", category);
  }

  const { data: roomTypes, error: roomTypesError } = await roomTypesQuery;
  if (roomTypesError) {
    return NextResponse.json({ error: roomTypesError.message }, { status: 500 });
  }
  if (!roomTypes || roomTypes.length === 0) {
    return NextResponse.json({ available: false, options: [] });
  }

  const results = [];

  for (const roomType of roomTypes) {
    const { data: units } = await supabase
      .from("room_units")
      .select("id")
      .eq("room_type_id", roomType.id)
      .eq("status", "available");

    const unitIds = (units ?? []).map((u) => u.id);
    if (unitIds.length === 0) continue;

    const { data: overlapping } = await supabase
      .from("bookings")
      .select("room_unit_id")
      .in("room_unit_id", unitIds)
      .in("status", ["pending_payment", "confirmed"])
      .lt("check_in", checkOut)
      .gt("check_out", checkIn);

    const bookedUnitIds = new Set((overlapping ?? []).map((b) => b.room_unit_id));
    const freeUnitCount = unitIds.filter((id) => !bookedUnitIds.has(id)).length;

    if (freeUnitCount > 0) {
      const nights = Math.round(
        (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86_400_000
      );
      results.push({
        roomTypeId: roomType.id,
        name: roomType.name,
        slug: roomType.slug,
        pricePerNightKes: roomType.base_price_kes,
        pricePerNightUsd: roomType.base_price_usd,
        totalKes: roomType.base_price_kes * nights,
        nights,
        unitsAvailable: freeUnitCount,
        coverImageUrl: roomType.cover_image_url,
      });
    }
  }

  return NextResponse.json({ available: results.length > 0, options: results });
}
