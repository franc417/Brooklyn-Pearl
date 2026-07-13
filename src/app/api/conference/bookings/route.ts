import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { createConferenceBookingSchema } from "@/lib/validation";
import { submitOrder } from "@/lib/pesapal";
import { initiateStkPush } from "@/lib/mpesa";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = createConferenceBookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;
  const supabase = createServiceRoleClient();

  const { data: room, error: roomError } = await supabase
    .from("conference_rooms")
    .select("id, name, capacity, hourly_rate_kes")
    .eq("id", input.roomId)
    .eq("is_published", true)
    .maybeSingle();

  if (roomError || !room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
  if (input.attendeeCount > room.capacity) {
    return NextResponse.json({ error: `${room.name} seats up to ${room.capacity}` }, { status: 400 });
  }

  const hours = (new Date(input.bookingEnd).getTime() - new Date(input.bookingStart).getTime()) / 3_600_000;
  if (hours <= 0) {
    return NextResponse.json({ error: "bookingEnd must be after bookingStart" }, { status: 400 });
  }
  const totalAmount = Math.round(room.hourly_rate_kes * hours);

  const { data: booking, error: bookingError } = await supabase
    .from("conference_bookings")
    .insert({
      room_id: room.id,
      guest_first_name: input.firstName,
      guest_last_name: input.lastName,
      guest_email: input.email,
      guest_phone: input.phone,
      organization_name: input.organizationName ?? null,
      purpose: input.purpose ?? null,
      attendee_count: input.attendeeCount,
      booking_start: input.bookingStart,
      booking_end: input.bookingEnd,
      status: "pending_payment",
      total_amount: totalAmount,
      currency: "KES",
    })
    .select()
    .single();

  if (bookingError) {
    if (bookingError.message.includes("no_overlapping_conference_bookings")) {
      return NextResponse.json(
        { error: "That room was just booked for an overlapping time. Please choose another time or room." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: bookingError.message }, { status: 500 });
  }

  if (input.paymentMethod === "mpesa") {
    try {
      const stk = await initiateStkPush({
        phone: input.phone,
        amount: totalAmount,
        accountReference: `CONF-${booking.id.slice(0, 8)}`,
        description: `${room.name} hire`,
      });

      await supabase.from("payments").insert({
        source_table: "conference_bookings",
        source_id: booking.id,
        provider: "mpesa",
        provider_reference: stk.CheckoutRequestID,
        amount: totalAmount,
        currency: "KES",
        status: "pending",
        raw_response: stk,
      });

      return NextResponse.json({ bookingId: booking.id, mpesaPending: true, checkoutRequestId: stk.CheckoutRequestID });
    } catch (err) {
      return NextResponse.json(
        {
          bookingId: booking.id,
          error: "Your room is held, but we couldn't send the M-Pesa prompt. Please try again or contact us directly.",
          detail: err instanceof Error ? err.message : String(err),
        },
        { status: 502 }
      );
    }
  }

  try {
    const order = await submitOrder({
      merchantReference: booking.id,
      amount: totalAmount,
      currency: "KES",
      description: `${room.name} — ${hours}hr hire`,
      email: input.email,
      phone: input.phone,
      firstName: input.firstName,
      lastName: input.lastName,
    });

    await supabase.from("payments").insert({
      source_table: "conference_bookings",
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
    return NextResponse.json(
      {
        bookingId: booking.id,
        error: "Your room is held, but we couldn't start the payment step. Please try again or contact us directly.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 502 }
    );
  }
}
