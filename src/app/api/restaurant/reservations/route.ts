import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { createRestaurantReservationSchema } from "@/lib/validation";
import { sendRestaurantReservationEmail } from "@/lib/email";

// No Pesapal here — a table reservation has no fixed price (the bill depends
// on what's ordered), so this confirms instantly rather than routing through
// payment. Double-booking protection comes from the no_overlapping_reservations
// exclusion constraint (migration 002) — if two guests race for the same
// table, the database itself rejects the losing insert.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = createRestaurantReservationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;
  const supabase = createServiceRoleClient();

  const { data: table, error: tableError } = await supabase
    .from("restaurant_tables")
    .select("id, table_number, seats, status")
    .eq("id", input.tableId)
    .maybeSingle();

  if (tableError || !table || table.status !== "available") {
    return NextResponse.json({ error: "Table not found or not available" }, { status: 404 });
  }
  if (input.partySize > table.seats) {
    return NextResponse.json(
      { error: `Table ${table.table_number} seats up to ${table.seats}` },
      { status: 400 }
    );
  }

  const { data: reservation, error: reservationError } = await supabase
    .from("restaurant_reservations")
    .insert({
      table_id: table.id,
      guest_first_name: input.firstName,
      guest_last_name: input.lastName,
      guest_email: input.email,
      guest_phone: input.phone,
      party_size: input.partySize,
      reservation_start: input.reservationStart,
      reservation_end: input.reservationEnd,
      special_requests: input.specialRequests ?? null,
      status: "confirmed", // instant confirm — no payment gate for a reservation
    })
    .select()
    .single();

  if (reservationError) {
    if (reservationError.message.includes("no_overlapping_reservations")) {
      return NextResponse.json(
        { error: "That table was just booked for an overlapping time. Please choose another time or table." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: reservationError.message }, { status: 500 });
  }

  if (input.claimedOfferId) {
    await supabase.from("offer_redemptions").insert({
      offer_id: input.claimedOfferId,
      applied_to_table: "restaurant_reservations",
      applied_to_id: reservation.id,
      guest_first_name: input.firstName,
      guest_last_name: input.lastName,
      guest_email: input.email,
    });
  }

  const startDate = new Date(reservation.reservation_start);
  const dateLabel = startDate.toLocaleString("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });

  sendRestaurantReservationEmail({
    to: input.email,
    guestName: input.firstName,
    dateLabel,
    partySize: input.partySize,
    tableNumber: table.table_number,
    reservationId: reservation.id,
  }).catch((err) => console.error("Failed to send reservation email:", err));

  return NextResponse.json({ reservationId: reservation.id, status: "confirmed" });
}
