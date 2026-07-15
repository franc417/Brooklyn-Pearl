import { createServerSupabaseClient } from "@/lib/supabase/server";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface ActivityRow {
  id: string;
  type: "Hotel" | "BnB" | "Swimming" | "Restaurant" | "Conference" | "Event" | "Offer";
  guestName: string;
  guestEmail: string;
  serviceLabel: string;
  dateLabel: string;
  amount: string;
  status: string;
  createdAt: string;
}

const TYPE_FILTERS = ["All", "Hotel", "BnB", "Swimming", "Restaurant", "Conference", "Event", "Offer"] as const;

const STATUS_COLORS: Record<string, string> = {
  confirmed: "#2f6b3a",
  pending_payment: "#a47f50",
  cancelled: "#b33",
  completed: "#555",
  no_show: "#b33",
};

// Six differently-shaped tables (hotel dates vs swimming sessions vs
// conference hours vs a free-of-charge restaurant reservation) don't fit
// naturally into one SQL query, so this normalizes each into a common
// ActivityRow shape in application code rather than forcing a database
// view across fundamentally different booking models. Each query is
// capped at 50 rows — this is a recent-activity feed, not a full export.
export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type: activeFilter } = await searchParams;
  const supabase = await createServerSupabaseClient();

  const [hotel, swimming, restaurant, conference, events, offers] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, guest_first_name, guest_last_name, guest_email, check_in, check_out, status, total_amount, currency, created_at, room_types(name, category)")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("swimming_bookings")
      .select("id, guest_first_name, guest_last_name, guest_email, party_size, status, total_amount, currency, created_at, swimming_sessions(session_date, start_time)")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("restaurant_reservations")
      .select("id, guest_first_name, guest_last_name, guest_email, party_size, reservation_start, status, created_at, restaurant_tables(table_number)")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("conference_bookings")
      .select("id, guest_first_name, guest_last_name, guest_email, attendee_count, booking_start, status, total_amount, currency, created_at, conference_rooms(name)")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("event_bookings")
      .select("id, guest_first_name, guest_last_name, guest_email, quantity, status, total_amount, currency, ticket_number, checked_in_at, created_at, events(name)")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("offer_redemptions")
      .select("id, applied_to_table, redeemed_at, ticket_number, verified_at, offers(title, reward_description)")
      .order("redeemed_at", { ascending: false })
      .limit(50),
  ]);

  const rows: ActivityRow[] = [];

  for (const b of hotel.data ?? []) {
    const roomType = b.room_types as unknown as { name: string; category: string } | null;
    rows.push({
      id: b.id,
      type: roomType?.category === "bnb" ? "BnB" : "Hotel",
      guestName: `${b.guest_first_name} ${b.guest_last_name}`,
      guestEmail: b.guest_email,
      serviceLabel: roomType?.name ?? "Room",
      dateLabel: `${b.check_in} → ${b.check_out}`,
      amount: `${b.currency} ${b.total_amount.toLocaleString()}`,
      status: b.status,
      createdAt: b.created_at,
    });
  }

  for (const s of swimming.data ?? []) {
    const session = s.swimming_sessions as unknown as { session_date: string; start_time: string } | null;
    rows.push({
      id: s.id,
      type: "Swimming",
      guestName: `${s.guest_first_name} ${s.guest_last_name}`,
      guestEmail: s.guest_email,
      serviceLabel: `${s.party_size} guests`,
      dateLabel: session ? `${session.session_date}, ${session.start_time}` : "—",
      amount: `${s.currency} ${s.total_amount.toLocaleString()}`,
      status: s.status,
      createdAt: s.created_at,
    });
  }

  for (const r of restaurant.data ?? []) {
    const table = r.restaurant_tables as unknown as { table_number: string } | null;
    rows.push({
      id: r.id,
      type: "Restaurant",
      guestName: `${r.guest_first_name} ${r.guest_last_name}`,
      guestEmail: r.guest_email,
      serviceLabel: `Table ${table?.table_number ?? "—"} · ${r.party_size} guests`,
      dateLabel: new Date(r.reservation_start).toLocaleString("en-KE", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }),
      amount: "—", // reservations don't take online payment — see Phase 3 notes
      status: r.status,
      createdAt: r.created_at,
    });
  }

  for (const c of conference.data ?? []) {
    const room = c.conference_rooms as unknown as { name: string } | null;
    rows.push({
      id: c.id,
      type: "Conference",
      guestName: `${c.guest_first_name} ${c.guest_last_name}`,
      guestEmail: c.guest_email,
      serviceLabel: `${room?.name ?? "Room"} · ${c.attendee_count} attendees`,
      dateLabel: new Date(c.booking_start).toLocaleString("en-KE", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }),
      amount: `${c.currency} ${c.total_amount.toLocaleString()}`,
      status: c.status,
      createdAt: c.created_at,
    });
  }

  for (const e of events.data ?? []) {
    const event = e.events as unknown as { name: string } | null;
    rows.push({
      id: e.id,
      type: "Event",
      guestName: `${e.guest_first_name} ${e.guest_last_name}`,
      guestEmail: e.guest_email,
      serviceLabel: `${event?.name ?? "Event"} · ${e.quantity} ticket${e.quantity > 1 ? "s" : ""}${e.checked_in_at ? " · checked in" : ""}`,
      dateLabel: e.ticket_number ?? "—",
      amount: `${e.currency} ${e.total_amount.toLocaleString()}`,
      status: e.status,
      createdAt: e.created_at,
    });
  }

  for (const o of offers.data ?? []) {
    const offer = o.offers as unknown as { title: string; reward_description: string } | null;
    rows.push({
      id: o.id,
      type: "Offer",
      guestName: "—", // offer_redemptions doesn't denormalize guest name — see admin dashboard gap notes
      guestEmail: "—",
      serviceLabel: `${offer?.title ?? "Offer"} → ${o.applied_to_table}`,
      dateLabel: o.ticket_number ?? "—",
      amount: "—",
      status: o.verified_at ? "verified" : "pending_verification",
      createdAt: o.redeemed_at,
    });
  }

  rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const filtered = activeFilter && activeFilter !== "All" ? rows.filter((r) => r.type === activeFilter) : rows;

  return (
    <div>
      <h1 style={{ fontWeight: 300, fontSize: "1.6rem", color: "#292f1a", marginBottom: "0.4rem" }}>All Activity</h1>
      <p style={{ fontSize: "0.78rem", color: "#999", marginBottom: "1.4rem" }}>
        Hotel, BnB, Swimming, Restaurant, Conference, Events, and Offer redemptions — most recent 50 per type.
        Food ordering isn&apos;t built yet, so no &quot;Orders&quot; row type exists here yet.
      </p>

      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "1.2rem" }}>
        {TYPE_FILTERS.map((t) => (
          <Link
            key={t}
            href={t === "All" ? "/admin/activity" : `/admin/activity?type=${t}`}
            style={{
              padding: "0.35rem 0.8rem",
              fontSize: "0.7rem",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              textDecoration: "none",
              border: "1px solid #a47f50",
              color: (activeFilter ?? "All") === t ? "#fff" : "#a47f50",
              background: (activeFilter ?? "All") === t ? "#a47f50" : "transparent",
            }}
          >
            {t}
          </Link>
        ))}
      </div>

      <div style={{ background: "#fff", border: "1px solid #eee" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #eee", color: "#6b6b6b", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              <th style={cellStyle}>Type</th>
              <th style={cellStyle}>Guest</th>
              <th style={cellStyle}>Service</th>
              <th style={cellStyle}>When</th>
              <th style={cellStyle}>Amount</th>
              <th style={cellStyle}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={`${row.type}-${row.id}`} style={{ borderBottom: "1px solid #f3f3f3" }}>
                <td style={cellStyle}>
                  <span style={{ fontSize: "0.65rem", padding: "0.2rem 0.5rem", background: "#f0ece3", color: "#a47f50", fontWeight: 600 }}>{row.type}</span>
                </td>
                <td style={cellStyle}>
                  <div>{row.guestName}</div>
                  <div style={{ color: "#999", fontSize: "0.7rem" }}>{row.guestEmail}</div>
                </td>
                <td style={cellStyle}>{row.serviceLabel}</td>
                <td style={cellStyle}>{row.dateLabel}</td>
                <td style={cellStyle}>{row.amount}</td>
                <td style={cellStyle}>
                  <span style={{ color: STATUS_COLORS[row.status] ?? "#333", fontWeight: 600 }}>{row.status.replace(/_/g, " ")}</span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td style={cellStyle} colSpan={6}>Nothing here yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const cellStyle: React.CSSProperties = { padding: "0.7rem 0.9rem" };
