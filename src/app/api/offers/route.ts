import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createServiceRoleClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: offers, error } = await supabase
    .from("offers")
    .select("id, title, slug, description, qualifying_criteria, price_kes, reward_description, starts_at, expires_at, image_url")
    .eq("is_active", true)
    .lte("starts_at", today)
    .gte("expires_at", today)
    .order("expires_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ offers: offers ?? [] });
}
