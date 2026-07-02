import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

// Public endpoint — only ever returns staff-approved testimonials.
// Used by the homepage once we move testimonials from hardcoded HTML to
// live data (see README "Phase 2").
export async function GET() {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("testimonials")
    .select("id, guest_name, location, quote, rating")
    .eq("approved", true)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ testimonials: data });
}
