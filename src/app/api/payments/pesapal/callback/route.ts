import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getTransactionStatus } from "@/lib/pesapal";
import { sendBookingConfirmationEmail } from "@/lib/email";
import { confirmBookingSource } from "@/lib/bookingConfirmation";

// This is the IPN (Instant Payment Notification) URL registered with Pesapal
// (see README — one-time setup). Pesapal calls this server-to-server whenever
// a payment's status changes. Per Pesapal's design, the ping itself carries
// no trustworthy status — it's only a "go check now" signal — so we always
// call GetTransactionStatus ourselves before believing anything.
//
// Handles any Pesapal-backed service (hotel/BnB bookings, swimming) via the
// payment row's own source_table/source_id — see lib/bookingConfirmation.ts.
// Restaurant reservations never reach this handler; they don't take online
// payment.
async function handleIpn(orderTrackingId: string | null) {
  if (!orderTrackingId) {
    return NextResponse.json({ error: "Missing OrderTrackingId" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  const { data: payment } = await supabase
    .from("payments")
    .select("id, source_table, source_id")
    .eq("provider_reference", orderTrackingId)
    .maybeSingle();

  if (!payment) {
    return NextResponse.json({ error: "Unknown payment reference" }, { status: 404 });
  }

  const status = await getTransactionStatus(orderTrackingId);
  const isPaid = status.payment_status_description === "Completed";
  const isFailed = status.payment_status_description === "Failed";
  const newPaymentStatus = isPaid ? "completed" : isFailed ? "failed" : "pending";

  await supabase
    .from("payments")
    .update({ status: newPaymentStatus, raw_response: status })
    .eq("id", payment.id);

  if (isPaid) {
    // confirmBookingSource only transitions pending_payment -> confirmed once,
    // so a repeat IPN ping for an already-confirmed booking safely no-ops
    // (returns null) instead of sending a duplicate confirmation email.
    const confirmation = await confirmBookingSource(supabase, payment.source_table, payment.source_id);
    if (confirmation) {
      await sendBookingConfirmationEmail({
        to: confirmation.guestEmail,
        guestName: confirmation.guestFirstName,
        serviceName: confirmation.serviceName,
        dateLabel: confirmation.dateLabel,
        totalAmount: confirmation.totalAmount,
        currency: confirmation.currency,
        bookingId: confirmation.sourceId,
      });
    }
  } else if (isFailed) {
    await supabase
      .from(payment.source_table)
      .update({ status: "cancelled" })
      .eq("id", payment.source_id)
      .eq("status", "pending_payment");
  }

  // Pesapal expects this exact acknowledgement shape back.
  return NextResponse.json({
    orderNotificationType: "IPNCHANGE",
    orderTrackingId,
    status: 200,
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  return handleIpn(searchParams.get("OrderTrackingId"));
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  return handleIpn(body.OrderTrackingId ?? null);
}
