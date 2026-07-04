import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { createBookingSchema } from "@/lib/validation";
import { submitOrder } from "@/lib/pesapal";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = createBookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;
  const supabase = createServiceRoleClient();

  // 1. Confirm the room type exists and load its price
  const { data: roomType, error: roomTypeError } = await supabase
    .from("room_types")
    .select("id, name, base_price_kes, capacity")
    .eq("id", input.roomTypeId)
    .eq("is_published", true)
    .maybeSingle();

  if (roomTypeError || !roomType) {
    return NextResponse.json({ error: "Room type not found" }, { status: 404 });
  }
  if (input.guests > roomType.capacity) {
    return NextResponse.json(
      { error: `${roomType.name} sleeps up to ${roomType.capacity} guests` },
      { status: 400 }
    );
  }

  // 2. Find one free physical room of that type for the requested dates
  const { data: units } = await supabase
    .from("room_units")
    .select("id")
    .eq("room_type_id", roomType.id)
    .eq("status", "available");
  const unitIds = (units ?? []).map((u) => u.id);

  const { data: overlapping } = await supabase
    .from("bookings")
    .select("room_unit_id")
    .in("room_unit_id", unitIds.length ? unitIds : ["00000000-0000-0000-0000-000000000000"])
    .in("status", ["pending_payment", "confirmed"])
    .lt("check_in", input.checkOut)
    .gt("check_out", input.checkIn);

  const bookedUnitIds = new Set((overlapping ?? []).map((b) => b.room_unit_id));
  const availableUnitId = unitIds.find((id) => !bookedUnitIds.has(id));

  if (!availableUnitId) {
    return NextResponse.json(
      { error: "No rooms of that type are available for those dates" },
      { status: 409 }
    );
  }

  const nights = Math.round(
    (new Date(input.checkOut).getTime() - new Date(input.checkIn).getTime()) / 86_400_000
  );
  const totalAmount = roomType.base_price_kes * nights;

  // 3. Create the booking. If two guests race for the same room, the
  // no_overlapping_bookings exclusion constraint in schema.sql makes the
  // database itself reject the losing insert — belt and suspenders on top
  // of the availability check above.
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .insert({
      room_type_id: roomType.id,
      room_unit_id: availableUnitId,
      check_in: input.checkIn,
      check_out: input.checkOut,
      guests_count: input.guests,
      guest_first_name: input.firstName,
      guest_last_name: input.lastName,
      guest_email: input.email,
      guest_phone: input.phone,
      special_requests: input.specialRequests ?? null,
      status: "pending_payment",
      total_amount: totalAmount,
      currency: "KES",
    })
    .select()
    .single();

  if (bookingError) {
    if (bookingError.message.includes("no_overlapping_bookings")) {
      return NextResponse.json(
        { error: "That room was just booked by someone else. Please try different dates." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: bookingError.message }, { status: 500 });
  }

  // 4. Kick off payment with Pesapal — the guest is redirected to a hosted
  // page offering card, M-Pesa, and Airtel Money.
  try {
    const order = await submitOrder({
      merchantReference: booking.id,
      amount: totalAmount,
      currency: "KES",
      description: `${roomType.name} — ${nights} night${nights > 1 ? "s" : ""}`,
      email: input.email,
      phone: input.phone,
      firstName: input.firstName,
      lastName: input.lastName,
    });

    await supabase.from("payments").insert({
      source_table: "bookings",
      source_id: booking.id,
      provider: "pesapal_card",
      provider_reference: order.order_tracking_id,
      amount: totalAmount,
      currency: "KES",
      status: "pending",
      raw_response: order,
    });

    return NextResponse.json({ bookingId: booking.id, redirectUrl: order.redirect_url });
  } catch (err) {
    // Booking row stays as pending_payment so staff can see and follow up
    // manually — we don't silently lose the reservation attempt.
    return NextResponse.json(
      {
        bookingId: booking.id,
        error:
          "Your room is held, but we couldn't start the payment step. Please try again or contact us directly.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 502 }
    );
  }
}
