import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getTransactionStatus } from "@/lib/pesapal";
import { sendBookingConfirmationEmail } from "@/lib/email";

// This is the IPN (Instant Payment Notification) URL registered with Pesapal
// (see README — one-time setup). Pesapal calls this server-to-server whenever
// a payment's status changes. Per Pesapal's design, the ping itself carries
// no trustworthy status — it's only a "go check now" signal — so we always
// call GetTransactionStatus ourselves before believing anything.
async function handleIpn(orderTrackingId: string | null, merchantReference: string | null) {
  if (!orderTrackingId) {
    return NextResponse.json({ error: "Missing OrderTrackingId" }, { status: 400 });
  }

  const status = await getTransactionStatus(orderTrackingId);
  const supabase = createServiceRoleClient();

  const isPaid = status.payment_status_description === "Completed";
  const newPaymentStatus = isPaid ? "completed" : status.payment_status_description === "Failed" ? "failed" : "pending";

  await supabase
    .from("payments")
    .update({ status: newPaymentStatus, raw_response: status })
    .eq("provider_reference", orderTrackingId);

  if (isPaid && merchantReference) {
    const { data: booking } = await supabase
      .from("bookings")
      .update({ status: "confirmed" })
      .eq("id", merchantReference)
      .eq("status", "pending_payment") // only transition once — avoids duplicate emails on repeat IPN pings
      .select("id, guest_first_name, guest_email, check_in, check_out, total_amount, currency, room_type_id")
      .maybeSingle();

    if (booking) {
      const { data: roomType } = await supabase
        .from("room_types")
        .select("name")
        .eq("id", booking.room_type_id)
        .maybeSingle();

      await sendBookingConfirmationEmail({
        to: booking.guest_email,
        guestName: booking.guest_first_name,
        roomTypeName: roomType?.name ?? "your room",
        checkIn: booking.check_in,
        checkOut: booking.check_out,
        totalAmount: booking.total_amount,
        currency: booking.currency,
        bookingId: booking.id,
      });
    }
  } else if (status.payment_status_description === "Failed" && merchantReference) {
    await supabase.from("bookings").update({ status: "cancelled" }).eq("id", merchantReference).eq("status", "pending_payment");
  }

  // Pesapal expects this exact acknowledgement shape back.
  return NextResponse.json({
    orderNotificationType: "IPNCHANGE",
    orderTrackingId,
    orderMerchantReference: merchantReference,
    status: 200,
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  return handleIpn(
    searchParams.get("OrderTrackingId"),
    searchParams.get("OrderMerchantReference")
  );
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  return handleIpn(
    body.OrderTrackingId ?? null,
    body.OrderMerchantReference ?? null
  );
}
