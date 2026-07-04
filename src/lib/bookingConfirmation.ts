import type { SupabaseClient } from "@supabase/supabase-js";

export interface ConfirmationResult {
  guestEmail: string;
  guestFirstName: string;
  serviceName: string;
  dateLabel: string;
  totalAmount: number;
  currency: string;
  sourceId: string;
}

/**
 * Confirms a booking regardless of which table it lives in, given the
 * (source_table, source_id) pair stored on its `payments` row. Only
 * `bookings` (hotel/BnB) and `swimming_bookings` go through this — both are
 * fixed-price, Pesapal-backed purchases. `restaurant_reservations` never
 * appear here because they don't take online payment (see api/restaurant/
 * reservations/route.ts) and confirm immediately on creation instead.
 *
 * Returns null if there was nothing in `pending_payment` state to confirm —
 * this makes the function safe to call more than once for the same
 * payment (Pesapal's IPN can legitimately fire more than once).
 */
export async function confirmBookingSource(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  sourceTable: string,
  sourceId: string
): Promise<ConfirmationResult | null> {
  if (sourceTable === "bookings") {
    const { data: booking } = await supabase
      .from("bookings")
      .update({ status: "confirmed" })
      .eq("id", sourceId)
      .eq("status", "pending_payment")
      .select("id, guest_first_name, guest_email, check_in, check_out, total_amount, currency, room_type_id")
      .maybeSingle();
    if (!booking) return null;

    const { data: roomType } = await supabase
      .from("room_types")
      .select("name")
      .eq("id", booking.room_type_id)
      .maybeSingle();

    return {
      guestEmail: booking.guest_email,
      guestFirstName: booking.guest_first_name,
      serviceName: roomType?.name ?? "your room",
      dateLabel: `${booking.check_in} → ${booking.check_out}`,
      totalAmount: booking.total_amount,
      currency: booking.currency,
      sourceId: booking.id,
    };
  }

  if (sourceTable === "swimming_bookings") {
    const { data: swim } = await supabase
      .from("swimming_bookings")
      .update({ status: "confirmed" })
      .eq("id", sourceId)
      .eq("status", "pending_payment")
      .select("id, guest_first_name, guest_email, total_amount, currency, session_id, claimed_offer_id")
      .maybeSingle();
    if (!swim) return null;

    if (swim.claimed_offer_id) {
      await supabase.from("offer_redemptions").insert({
        offer_id: swim.claimed_offer_id,
        applied_to_table: "swimming_bookings",
        applied_to_id: swim.id,
      });
    }

    const { data: session } = await supabase
      .from("swimming_sessions")
      .select("session_date, start_time, end_time")
      .eq("id", swim.session_id)
      .maybeSingle();

    return {
      guestEmail: swim.guest_email,
      guestFirstName: swim.guest_first_name,
      serviceName: "Swimming session",
      dateLabel: session
        ? `${session.session_date}, ${session.start_time}–${session.end_time}`
        : "",
      totalAmount: swim.total_amount,
      currency: swim.currency,
      sourceId: swim.id,
    };
  }

  if (sourceTable === "event_bookings") {
    const { data: eventBooking } = await supabase
      .from("event_bookings")
      .update({ status: "confirmed" })
      .eq("id", sourceId)
      .eq("status", "pending_payment")
      .select("id, guest_first_name, guest_email, quantity, total_amount, currency, event_id")
      .maybeSingle();
    if (!eventBooking) return null;

    const { data: event } = await supabase
      .from("events")
      .select("name, event_date, start_time")
      .eq("id", eventBooking.event_id)
      .maybeSingle();

    return {
      guestEmail: eventBooking.guest_email,
      guestFirstName: eventBooking.guest_first_name,
      serviceName: `${event?.name ?? "Event"} (${eventBooking.quantity} ticket${eventBooking.quantity > 1 ? "s" : ""})`,
      dateLabel: event ? `${event.event_date}${event.start_time ? `, ${event.start_time}` : ""}` : "",
      totalAmount: eventBooking.total_amount,
      currency: eventBooking.currency,
      sourceId: eventBooking.id,
    };
  }

  return null;
}
