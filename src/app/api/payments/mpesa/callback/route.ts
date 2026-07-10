import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { confirmBookingSource } from "@/lib/bookingConfirmation";
import { sendBookingConfirmationEmail } from "@/lib/email";
import { parseCallbackMetadata, type StkCallbackBody } from "@/lib/mpesa";

// Safaricom's rule, not a suggestion: if this endpoint returns anything
// other than 200, they retry 3 times and then quarantine the whole app —
// meaning ALL future callbacks stop arriving, not just this one. Every
// path through this handler, including internal errors, returns 200; we
// just log failures instead of surfacing them as HTTP error codes.
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as StkCallbackBody;
    const { CheckoutRequestID, ResultCode, ResultDesc } = body.Body.stkCallback;

    const supabase = createServiceRoleClient();
    const { data: payment } = await supabase
      .from("payments")
      .select("id, source_table, source_id")
      .eq("provider_reference", CheckoutRequestID)
      .maybeSingle();

    if (!payment) {
      console.error("M-Pesa callback for unknown CheckoutRequestID:", CheckoutRequestID);
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    const isPaid = ResultCode === 0;

    if (isPaid) {
      const { mpesaReceiptNumber } = parseCallbackMetadata(body);
      await supabase
        .from("payments")
        .update({ status: "completed", confirmation_code: mpesaReceiptNumber, raw_response: body })
        .eq("id", payment.id);

      // confirmBookingSource only transitions pending_payment -> confirmed
      // once, so a duplicate callback (Safaricom's own retry behavior)
      // safely no-ops here instead of sending a second confirmation email.
      const confirmation = await confirmBookingSource(supabase, payment.source_table, payment.source_id);
      if (confirmation) {
        sendBookingConfirmationEmail({
          to: confirmation.guestEmail,
          guestName: confirmation.guestFirstName,
          serviceName: confirmation.serviceName,
          dateLabel: confirmation.dateLabel,
          totalAmount: confirmation.totalAmount,
          currency: confirmation.currency,
          bookingId: confirmation.sourceId,
        }).catch((err) => console.error("Failed to send M-Pesa confirmation email:", err));
      }
    } else {
      // ResultCode 1032 = cancelled by user, 1037 = timeout, etc. — all
      // just mean "not paid", not a system error.
      await supabase
        .from("payments")
        .update({ status: "failed", raw_response: body })
        .eq("id", payment.id);
      await supabase
        .from(payment.source_table)
        .update({ status: "cancelled" })
        .eq("id", payment.source_id)
        .eq("status", "pending_payment");
      console.log("M-Pesa payment not completed:", ResultDesc);
    }
  } catch (err) {
    // Still return 200 — see the rule at the top of this file. Whatever
    // went wrong here is a bug to fix, not something Safaricom should
    // retry, since retrying won't fix a parsing/database error.
    console.error("Error processing M-Pesa callback:", err);
  }

  return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
}
