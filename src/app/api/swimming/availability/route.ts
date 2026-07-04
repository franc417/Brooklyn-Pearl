import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { swimmingAvailabilityQuerySchema } from "@/lib/validation";

// Same reasoning as api/availability/route.ts: this runs server-side with
// the service role client because computing "how many spots are left"
// requires reading bookings across all guests for a session, which the
// public anon key can't do under RLS.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const parsed = swimmingAvailabilityQuerySchema.safeParse({
    date: searchParams.get("date"),
    partySize: searchParams.get("partySize") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { date, partySize } = parsed.data;

  const supabase = createServiceRoleClient();

  const { data: sessions, error } = await supabase
    .from("swimming_sessions")
    .select("id, session_date, start_time, end_time, capacity, price_kes")
    .eq("session_date", date)
    .eq("is_published", true)
    .order("start_time", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!sessions || sessions.length === 0) {
    return NextResponse.json({ available: false, options: [] });
  }

  const sessionIds = sessions.map((s) => s.id);
  const { data: bookings } = await supabase
    .from("swimming_bookings")
    .select("session_id, party_size")
    .in("session_id", sessionIds)
    .in("status", ["pending_payment", "confirmed"]);

  const bookedBySession = new Map<string, number>();
  for (const b of bookings ?? []) {
    bookedBySession.set(b.session_id, (bookedBySession.get(b.session_id) ?? 0) + b.party_size);
  }

  const options = sessions
    .map((s) => {
      const booked = bookedBySession.get(s.id) ?? 0;
      const spotsLeft = s.capacity - booked;
      return {
        sessionId: s.id,
        startTime: s.start_time,
        endTime: s.end_time,
        pricePerPersonKes: s.price_kes,
        totalKes: s.price_kes * partySize,
        spotsLeft,
      };
    })
    .filter((o) => o.spotsLeft >= partySize);

  return NextResponse.json({ available: options.length > 0, options });
}
