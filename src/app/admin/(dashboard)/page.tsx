import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function AdminOverviewPage() {
  const supabase = await createServerSupabaseClient();

  const [{ count: pendingBookings }, { count: confirmedBookings }, { count: newEnquiries }] =
    await Promise.all([
      supabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "pending_payment"),
      supabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "confirmed"),
      supabase.from("enquiries").select("*", { count: "exact", head: true }).eq("status", "new"),
    ]);

  return (
    <div>
      <h1 style={{ fontWeight: 300, fontSize: "1.6rem", color: "#292f1a", marginBottom: "1.8rem" }}>
        Overview
      </h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.2rem" }}>
        <StatCard label="Confirmed Bookings" value={confirmedBookings ?? 0} />
        <StatCard label="Awaiting Payment" value={pendingBookings ?? 0} />
        <StatCard label="New Enquiries" value={newEnquiries ?? 0} />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ background: "#fff", padding: "1.6rem", border: "1px solid #eee" }}>
      <p style={{ fontSize: "0.68rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#6b6b6b", marginBottom: "0.6rem" }}>
        {label}
      </p>
      <p style={{ fontSize: "2rem", fontWeight: 300, color: "#292f1a" }}>{value}</p>
    </div>
  );
}
