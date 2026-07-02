import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { enquirySchema } from "@/lib/validation";
import { sendStaffEnquiryNotification } from "@/lib/email";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = enquirySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;

  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("enquiries").insert({
    first_name: input.firstName,
    last_name: input.lastName,
    email: input.email,
    enquiry_type: input.enquiryType,
    message: input.message,
    status: "new",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Best-effort — a slow/failed email shouldn't make the guest think their
  // enquiry wasn't received, since it's already safely in the database.
  sendStaffEnquiryNotification(input).catch((err) =>
    console.error("Failed to send staff enquiry notification:", err)
  );

  return NextResponse.json({ success: true });
}
