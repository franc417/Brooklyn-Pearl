import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient, createServerSupabaseClient } from "@/lib/supabase/server";
import { createSwimmingBookingSchema } from "@/lib/validation";
import { submitOrder } from "@/lib/pesapal";
import { sendBookingConfirmationEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = createSwimmingBookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;
  const supabase = createServiceRoleClient();

  const sessionClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();

  const { data: session, error: sessionError } = await supabase
    .from("swimming_sessions")
    .select("id, session_date, start_time, end_time, capacity, price_kes")
    .eq("id", input.sessionId)
    .eq("is_published", true)
    .maybeSingle();

  if (sessionError || !session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Re-check capacity here too (not just rely on the trigger) so we can
  // return a clean error message instead of a raw Postgres exception.
  const { data: existingBookings } = await supabase
    .from("swimming_bookings")
    .select("party_size")
    .eq("session_id", session.id)
    .in("status", ["pending_payment", "confirmed"]);
  const booked = (existingBookings ?? []).reduce((sum, b) => sum + b.party_size, 0);

  if (booked + input.partySize > session.capacity) {
    return NextResponse.json(
      { error: `Only ${session.capacity - booked} spots left in this session` },
      { status: 409 }
    );
  }

  const totalAmount = session.price_kes * input.partySize;

  let useLoyaltyReward = false;
  if (user) {
    const { data: eligible } = await supabase.rpc("guest_has_free_reward", {
      p_guest_id: user.id,
      p_service_category: "swimming",
    });
    useLoyaltyReward = eligible === true;
  }

  // The check_swimming_capacity trigger (schema.sql migration 002) is the
  // real safety net against a race between this check and the insert below —
  // it locks the session row and re-verifies atomically, same guarantee
  // Phase 0's exclusion constraint gives hotel rooms, just a different
  // mechanism suited to a capacity-sum problem instead of an overlap problem.
  const { data: booking, error: bookingError } = await supabase
    .from("swimming_bookings")
    .insert({
      guest_id: user?.id ?? null,
      session_id: session.id,
      guest_first_name: input.firstName,
      guest_last_name: input.lastName,
      guest_email: input.email,
      guest_phone: input.phone,
      party_size: input.partySize,
      status: useLoyaltyReward ? "confirmed" : "pending_payment",
      total_amount: useLoyaltyReward ? 0 : totalAmount,
      currency: "KES",
      claimed_offer_id: input.claimedOfferId ?? null,
      is_loyalty_reward: useLoyaltyReward,
    })
    .select()
    .single();

  if (bookingError) {
    if (bookingError.message.includes("capacity exceeded")) {
      return NextResponse.json(
        { error: "That session just filled up. Please choose a different time." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: bookingError.message }, { status: 500 });
  }

  if (useLoyaltyReward) {
    if (input.claimedOfferId) {
      await supabase.from("offer_redemptions").insert({
        offer_id: input.claimedOfferId,
        applied_to_table: "swimming_bookings",
        applied_to_id: booking.id,
      });
    }

    sendBookingConfirmationEmail({
      to: input.email,
      guestName: input.firstName,
      serviceName: "Swimming session (loyalty reward)",
      dateLabel: `${session.session_date}, ${session.start_time}–${session.end_time}`,
      totalAmount: 0,
      currency: "KES",
      bookingId: booking.id,
    }).catch((err) => console.error("Failed to send loyalty-reward confirmation email:", err));

    return NextResponse.json({ bookingId: booking.id, status: "confirmed", loyaltyReward: true });
  }

  try {
    const order = await submitOrder({
      merchantReference: booking.id,
      amount: totalAmount,
      currency: "KES",
      description: `Swimming session — ${input.partySize} ${input.partySize > 1 ? "people" : "person"}`,
      email: input.email,
      phone: input.phone,
      firstName: input.firstName,
      lastName: input.lastName,
    });

    await supabase.from("payments").insert({
      source_table: "swimming_bookings",
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
        error: "Your spot is held, but we couldn't start the payment step. Please try again or contact us directly.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 502 }
    );
  }
}
