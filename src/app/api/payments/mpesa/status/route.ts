import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

// The client polls this every few seconds after initiating an STK push,
// since there's no redirect to wait on the way there is with Pesapal —
// this checks OUR OWN payments table (kept current by the callback route),
// not Safaricom's API directly, so it stays fast and doesn't need its own
// Daraja auth token.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const checkoutRequestId = searchParams.get("checkoutRequestId");

  if (!checkoutRequestId) {
    return NextResponse.json({ error: "Missing checkoutRequestId" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data: payment } = await supabase
    .from("payments")
    .select("status")
    .eq("provider_reference", checkoutRequestId)
    .maybeSingle();

  if (!payment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ status: payment.status });
}
