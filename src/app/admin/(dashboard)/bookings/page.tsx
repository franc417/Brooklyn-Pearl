import { createServerSupabaseClient } from "@/lib/supabase/server";

const STATUS_COLORS: Record<string, string> = {
  confirmed: "#2f6b3a",
  pending_payment: "#a47f50",
  cancelled: "#b33",
  completed: "#555",
  no_show: "#b33",
};

export default async function AdminBookingsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, guest_first_name, guest_last_name, guest_email, check_in, check_out, status, total_amount, currency, room_types(name)")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <h1 style={{ fontWeight: 300, fontSize: "1.6rem", color: "#292f1a", marginBottom: "1.8rem" }}>
        Bookings
      </h1>
      <div style={{ background: "#fff", border: "1px solid #eee" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #eee", color: "#6b6b6b", fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              <th style={cellStyle}>Guest</th>
              <th style={cellStyle}>Room</th>
              <th style={cellStyle}>Check-in</th>
              <th style={cellStyle}>Check-out</th>
              <th style={cellStyle}>Amount</th>
              <th style={cellStyle}>Status</th>
            </tr>
          </thead>
          <tbody>
            {(bookings ?? []).map((b) => (
              <tr key={b.id} style={{ borderBottom: "1px solid #f3f3f3" }}>
                <td style={cellStyle}>
                  <div>{b.guest_first_name} {b.guest_last_name}</div>
                  <div style={{ color: "#999", fontSize: "0.72rem" }}>{b.guest_email}</div>
                </td>
                {/* room_types is joined — Supabase returns an object here since it's a to-one relation */}
                <td style={cellStyle}>{(b.room_types as unknown as { name: string } | null)?.name ?? "—"}</td>
                <td style={cellStyle}>{b.check_in}</td>
                <td style={cellStyle}>{b.check_out}</td>
                <td style={cellStyle}>{b.currency} {b.total_amount.toLocaleString()}</td>
                <td style={cellStyle}>
                  <span style={{ color: STATUS_COLORS[b.status] ?? "#333", fontWeight: 600 }}>
                    {b.status.replace("_", " ")}
                  </span>
                </td>
              </tr>
            ))}
            {(!bookings || bookings.length === 0) && (
              <tr>
                <td style={cellStyle} colSpan={6}>No bookings yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const cellStyle: React.CSSProperties = { padding: "0.8rem 1rem" };
