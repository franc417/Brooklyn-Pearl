"use client";

import { useState } from "react";

interface VerifyResult {
  valid: boolean;
  error?: string;
  alreadyCheckedIn?: boolean;
  checkedInAt?: string;
  guestName?: string;
  eventName?: string;
  offerTitle?: string;
  rewardDescription?: string;
  quantity?: number;
}

export default function VerifyTicketPage() {
  const [ticketNumber, setTicketNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function runAction(action: "lookup" | "checkin") {
    if (!ticketNumber || !verificationCode) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/tickets/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketNumber: ticketNumber.trim().toUpperCase(), verificationCode: verificationCode.trim().toUpperCase(), action }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ valid: false, error: "Network error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 style={{ fontWeight: 300, fontSize: "1.6rem", color: "#292f1a", marginBottom: "0.6rem" }}>Verify Ticket</h1>
      <p style={{ fontSize: "0.78rem", color: "#999", marginBottom: "1.8rem" }}>
        For event tickets (BP-EVT-...) and offer redemptions (BP-OFR-...)
      </p>

      <div style={{ background: "#fff", border: "1px solid #eee", padding: "1.6rem", maxWidth: 420 }}>
        <label style={{ display: "block", fontSize: "0.68rem", color: "#6b6b6b", marginBottom: "0.3rem" }}>Ticket Number</label>
        <input
          value={ticketNumber}
          onChange={(e) => setTicketNumber(e.target.value)}
          placeholder="BP-EVT-XXXXXXXX"
          style={{ width: "100%", padding: "0.7rem", border: "1px solid #ddd", marginBottom: "1rem", fontFamily: "monospace", textTransform: "uppercase" }}
        />
        <label style={{ display: "block", fontSize: "0.68rem", color: "#6b6b6b", marginBottom: "0.3rem" }}>Verification Code</label>
        <input
          value={verificationCode}
          onChange={(e) => setVerificationCode(e.target.value)}
          placeholder="ABC123"
          style={{ width: "100%", padding: "0.7rem", border: "1px solid #ddd", marginBottom: "1.3rem", fontFamily: "monospace", textTransform: "uppercase" }}
        />
        <div style={{ display: "flex", gap: "0.6rem" }}>
          <button
            onClick={() => runAction("lookup")}
            disabled={loading}
            style={{ flex: 1, background: "transparent", border: "1px solid #a47f50", color: "#a47f50", padding: "0.7rem", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", cursor: "pointer" }}
          >
            Look Up
          </button>
          <button
            onClick={() => runAction("checkin")}
            disabled={loading}
            style={{ flex: 1, background: "#a47f50", border: "none", color: "#fff", padding: "0.7rem", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", cursor: "pointer" }}
          >
            Check In
          </button>
        </div>

        {result && (
          <div style={{ marginTop: "1.4rem", padding: "1rem", background: result.valid ? (result.alreadyCheckedIn ? "#fdf6ec" : "#eaf4ea") : "#fbeaea" }}>
            {result.valid ? (
              <>
                <p style={{ fontWeight: 600, color: result.alreadyCheckedIn ? "#a47f50" : "#2f6b3a", marginBottom: "0.4rem" }}>
                  {result.alreadyCheckedIn ? "⚠ Already checked in" : "✓ Valid"}
                </p>
                {result.guestName && <p style={{ fontSize: "0.85rem" }}>{result.guestName} · {result.quantity} ticket{result.quantity !== 1 ? "s" : ""}</p>}
                {result.eventName && <p style={{ fontSize: "0.78rem", color: "#666" }}>{result.eventName}</p>}
                {result.offerTitle && <p style={{ fontSize: "0.85rem" }}>{result.offerTitle}</p>}
                {result.rewardDescription && <p style={{ fontSize: "0.78rem", color: "#666" }}>{result.rewardDescription}</p>}
                {result.checkedInAt && <p style={{ fontSize: "0.72rem", color: "#999", marginTop: "0.3rem" }}>Checked in {new Date(result.checkedInAt).toLocaleString()}</p>}
              </>
            ) : (
              <p style={{ color: "#b33", fontWeight: 600 }}>✗ {result.error || "Invalid ticket"}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
