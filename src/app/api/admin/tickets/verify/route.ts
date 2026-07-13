import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleClient, createServerSupabaseClient } from "@/lib/supabase/server";

const verifySchema = z.object({
  ticketNumber: z.string().trim().min(1),
  verificationCode: z.string().trim().min(1),
  action: z.enum(["lookup", "checkin"]).default("lookup"),
});

// Protected by proxy.ts (matcher covers /api/admin/:path*) — staff only.
// Looks in both event_bookings and offer_redemptions since both carry a
// ticket_number/verification_code pair (migration: ticket verification).
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { ticketNumber, verificationCode, action } = parsed.data;
  const supabase = createServiceRoleClient();

  const isEventTicket = ticketNumber.startsWith("BP-EVT-");
  const isOfferTicket = ticketNumber.startsWith("BP-OFR-");

  if (!isEventTicket && !isOfferTicket) {
    return NextResponse.json({ valid: false, error: "Unrecognized ticket format" }, { status: 404 });
  }

  if (isEventTicket) {
    const { data: ticket } = await supabase
      .from("event_bookings")
      .select("id, ticket_number, verification_code, guest_first_name, guest_last_name, quantity, status, checked_in_at, event_id")
      .eq("ticket_number", ticketNumber)
      .maybeSingle();

    if (!ticket || ticket.verification_code !== verificationCode) {
      return NextResponse.json({ valid: false, error: "Ticket not found or code doesn't match" }, { status: 404 });
    }
    if (ticket.status !== "confirmed") {
      return NextResponse.json({ valid: false, error: `Ticket status is "${ticket.status}", not confirmed` });
    }

    const { data: event } = await supabase.from("events").select("name").eq("id", ticket.event_id).maybeSingle();

    if (action === "checkin") {
      if (ticket.checked_in_at) {
        return NextResponse.json({
          valid: true,
          alreadyCheckedIn: true,
          checkedInAt: ticket.checked_in_at,
          guestName: `${ticket.guest_first_name} ${ticket.guest_last_name}`,
          eventName: event?.name,
          quantity: ticket.quantity,
        });
      }

      const sessionClient = await createServerSupabaseClient();
      const { data: { user } } = await sessionClient.auth.getUser();

      await supabase
        .from("event_bookings")
        .update({ checked_in_at: new Date().toISOString(), checked_in_by: user?.id ?? null })
        .eq("id", ticket.id);
    }

    return NextResponse.json({
      valid: true,
      alreadyCheckedIn: !!ticket.checked_in_at,
      guestName: `${ticket.guest_first_name} ${ticket.guest_last_name}`,
      eventName: event?.name,
      quantity: ticket.quantity,
    });
  }

  // Offer ticket
  const { data: redemption } = await supabase
    .from("offer_redemptions")
    .select("id, ticket_number, verification_code, offer_id, verified_at, guest_id")
    .eq("ticket_number", ticketNumber)
    .maybeSingle();

  if (!redemption || redemption.verification_code !== verificationCode) {
    return NextResponse.json({ valid: false, error: "Ticket not found or code doesn't match" }, { status: 404 });
  }

  const { data: offer } = await supabase.from("offers").select("title, reward_description").eq("id", redemption.offer_id).maybeSingle();

  if (action === "checkin") {
    if (redemption.verified_at) {
      return NextResponse.json({
        valid: true,
        alreadyCheckedIn: true,
        checkedInAt: redemption.verified_at,
        offerTitle: offer?.title,
        rewardDescription: offer?.reward_description,
      });
    }

    const sessionClient = await createServerSupabaseClient();
    const { data: { user } } = await sessionClient.auth.getUser();

    await supabase
      .from("offer_redemptions")
      .update({ verified_at: new Date().toISOString(), verified_by: user?.id ?? null })
      .eq("id", redemption.id);
  }

  return NextResponse.json({
    valid: true,
    alreadyCheckedIn: !!redemption.verified_at,
    offerTitle: offer?.title,
    rewardDescription: offer?.reward_description,
  });
}
