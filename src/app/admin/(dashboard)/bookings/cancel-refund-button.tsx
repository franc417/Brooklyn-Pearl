"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CancelRefundButton({ bookingId, amount, currency }: { bookingId: string; amount: number; currency: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel() {
    const confirmed = window.confirm(
      `Refund ${currency} ${amount.toLocaleString()} and cancel this booking? This is a real Pesapal refund and can only be requested once per payment.`
    );
    if (!confirmed) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/bookings/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceTable: "bookings", sourceId: bookingId }),
      });
      const data = await res.json();
      if (res.ok) {
        router.refresh();
      } else {
        setError(data.error || "Refund failed");
        setLoading(false);
      }
    } catch {
      setError("Network error");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleCancel}
        disabled={loading}
        style={{
          background: "transparent",
          border: "1px solid #b33",
          color: "#b33",
          padding: "0.3rem 0.7rem",
          fontSize: "0.65rem",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          cursor: "pointer",
        }}
      >
        {loading ? "Processing…" : "Cancel & Refund"}
      </button>
      {error && <p style={{ color: "#b33", fontSize: "0.68rem", marginTop: "0.3rem" }}>{error}</p>}
    </div>
  );
}
