import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleClient, createServerSupabaseClient } from "@/lib/supabase/server";
import { requestRefund } from "@/lib/pesapal";

const cancelSchema = z.object({
  sourceTable: z.enum(["bookings", "swimming_bookings", "event_bookings"]),
  sourceId: z.string().uuid(),
  remarks: z.string().trim().min(1).max(200).default("Cancelled by staff"),
});

// Protected by proxy.ts (matcher includes /api/admin/:path*) — only reaches
// here if the request is from an authenticated, active staff_profiles user.
// Full refunds only, deliberately: Pesapal only allows a mobile money
// (M-Pesa) refund to be for the FULL amount, and only ONE refund is ever
// allowed per payment — there's no safe way to offer a partial-refund UI
// here without risking using up that one shot on the wrong amount.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = cancelSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { sourceTable, sourceId, remarks } = parsed.data;

  const sessionClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();
  // Belt and suspenders — proxy.ts already guarantees this, but a route
  // handler should never assume a caller got here only through the app.
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();

  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .select("id, status, amount, confirmation_code")
    .eq("source_table", sourceTable)
    .eq("source_id", sourceId)
    .maybeSingle();

  if (paymentError || !payment) {
    return NextResponse.json({ error: "No payment found for this booking" }, { status: 404 });
  }
  if (payment.status !== "completed") {
    return NextResponse.json(
      { error: `Only completed payments can be refunded (this one is "${payment.status}")` },
      { status: 400 }
    );
  }
  if (!payment.confirmation_code) {
    return NextResponse.json(
      { error: "This payment has no confirmation code on file — refund it manually via the Pesapal dashboard" },
      { status: 400 }
    );
  }

  try {
    await requestRefund({
      confirmationCode: payment.confirmation_code,
      amount: payment.amount,
      remarks,
      username: user.email ?? "staff",
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Pesapal rejected the refund request", detail: err instanceof Error ? err.message : String(err) },
      { status: 502 }
    );
  }

  // Pesapal's response confirms the request was accepted, not that funds
  // have actually settled back to the guest yet — that happens on their
  // side asynchronously. Marking 'refunded' here reflects "refund
  // requested and accepted", which is the accurate claim to make; actual
  // settlement is worth spot-checking in the Pesapal merchant dashboard
  // until this flow has a track record.
  await supabase.from("payments").update({ status: "refunded" }).eq("id", payment.id);
  await supabase.from(sourceTable).update({ status: "cancelled" }).eq("id", sourceId);

  return NextResponse.json({ success: true });
}
