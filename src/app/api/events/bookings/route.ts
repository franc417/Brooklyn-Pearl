import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { createEventBookingSchema } from "@/lib/validation";
import { submitOrder } from "@/lib/pesapal";
import { sendBookingConfirmationEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = createEventBookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;
  const supabase = createServiceRoleClient();

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, name, price_kes, capacity, event_date, start_time")
    .eq("id", input.eventId)
    .eq("is_published", true)
    .maybeSingle();

  if (eventError || !event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // Pre-flight capacity check for a clean error message — the
  // check_event_capacity trigger (migration 002) is the actual race-safe
  // guarantee, same relationship as the pattern in api/swimming/bookings.
  if (event.capacity !== null) {
    const { data: existing } = await supabase
      .from("event_bookings")
      .select("quantity")
      .eq("event_id", event.id)
      .in("status", ["pending_payment", "confirmed"]);
    const booked = (existing ?? []).reduce((sum, b) => sum + b.quantity, 0);
    if (booked + input.quantity > event.capacity) {
      return NextResponse.json(
        { error: `Only ${event.capacity - booked} tickets left` },
        { status: 409 }
      );
    }
  }

  const isFree = event.price_kes === null || event.price_kes === 0;
  const totalAmount = isFree ? 0 : event.price_kes * input.quantity;

  const { data: booking, error: bookingError } = await supabase
    .from("event_bookings")
    .insert({
      event_id: event.id,
      guest_first_name: input.firstName,
      guest_last_name: input.lastName,
      guest_email: input.email,
      guest_phone: input.phone,
      quantity: input.quantity,
      status: isFree ? "confirmed" : "pending_payment", // free events skip the payment gate entirely
      total_amount: totalAmount,
      currency: "KES",
    })
    .select()
    .single();

  if (bookingError) {
    if (bookingError.message.includes("capacity exceeded")) {
      return NextResponse.json(
        { error: "Those tickets just sold out. Please choose a smaller quantity." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: bookingError.message }, { status: 500 });
  }

  if (isFree) {
    sendBookingConfirmationEmail({
      to: input.email,
      guestName: input.firstName,
      serviceName: `${event.name} (${input.quantity} ticket${input.quantity > 1 ? "s" : ""})`,
      dateLabel: `${event.event_date}${event.start_time ? `, ${event.start_time}` : ""}`,
      totalAmount: 0,
      currency: "KES",
      bookingId: booking.id,
    }).catch((err) => console.error("Failed to send free-event confirmation email:", err));

    return NextResponse.json({ bookingId: booking.id, status: "confirmed" });
  }

  try {
    const order = await submitOrder({
      merchantReference: booking.id,
      amount: totalAmount,
      currency: "KES",
      description: `${event.name} — ${input.quantity} ticket${input.quantity > 1 ? "s" : ""}`,
      email: input.email,
      phone: input.phone,
      firstName: input.firstName,
      lastName: input.lastName,
    });

    await supabase.from("payments").insert({
      source_table: "event_bookings",
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
        error: "Your tickets are held, but we couldn't start the payment step. Please try again or contact us directly.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 502 }
    );
  }
}
