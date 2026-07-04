import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = createServiceRoleClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: offer, error } = await supabase
    .from("offers")
    .select("id, title, slug, description, qualifying_criteria, price_kes, reward_description, starts_at, expires_at, image_url")
    .eq("slug", slug)
    .eq("is_active", true)
    .lte("starts_at", today)
    .gte("expires_at", today)
    .maybeSingle();

  if (error || !offer) {
    return NextResponse.json({ error: "Offer not found or no longer active" }, { status: 404 });
  }
  return NextResponse.json(offer);
}
