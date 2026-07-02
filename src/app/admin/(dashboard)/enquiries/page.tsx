import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function markClosed(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  const supabase = await createServerSupabaseClient();
  await supabase.from("enquiries").update({ status: "closed" }).eq("id", id);
  revalidatePath("/admin/enquiries");
}

const TYPE_LABELS: Record<string, string> = {
  room_reservation: "Room Reservation",
  dining_reservation: "Dining Reservation",
  event_wedding: "Event / Wedding",
  general: "General",
};

export default async function AdminEnquiriesPage() {
  const supabase = await createServerSupabaseClient();
  const { data: enquiries } = await supabase
    .from("enquiries")
    .select("id, first_name, last_name, email, enquiry_type, message, status, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <h1 style={{ fontWeight: 300, fontSize: "1.6rem", color: "#292f1a", marginBottom: "1.8rem" }}>
        Enquiries
      </h1>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {(enquiries ?? []).map((e) => (
          <div key={e.id} style={{ background: "#fff", border: "1px solid #eee", padding: "1.4rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.6rem" }}>
              <div>
                <strong style={{ fontSize: "0.9rem" }}>{e.first_name} {e.last_name}</strong>
                <span style={{ color: "#999", fontSize: "0.78rem", marginLeft: "0.6rem" }}>{e.email}</span>
              </div>
              <span
                style={{
                  fontSize: "0.65rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: e.status === "new" ? "#a47f50" : "#999",
                  fontWeight: 600,
                }}
              >
                {e.status}
              </span>
            </div>
            <p style={{ fontSize: "0.72rem", color: "#a47f50", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.6rem" }}>
              {TYPE_LABELS[e.enquiry_type] ?? e.enquiry_type}
            </p>
            <p style={{ fontSize: "0.85rem", color: "#333", lineHeight: 1.6, marginBottom: "1rem" }}>{e.message}</p>
            {e.status !== "closed" && (
              <form action={markClosed}>
                <input type="hidden" name="id" value={e.id} />
                <button
                  type="submit"
                  style={{
                    background: "transparent",
                    border: "1px solid #a47f50",
                    color: "#a47f50",
                    padding: "0.4rem 1rem",
                    fontSize: "0.68rem",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                  }}
                >
                  Mark Handled
                </button>
              </form>
            )}
          </div>
        ))}
        {(!enquiries || enquiries.length === 0) && <p style={{ color: "#999" }}>No enquiries yet.</p>}
      </div>
    </div>
  );
}
