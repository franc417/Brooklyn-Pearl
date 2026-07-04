"use client";

import { useState } from "react";
import {
  Field,
  inputStyle,
  buttonStyle,
  overlayStyle,
  modalStyle,
  closeButtonStyle,
  eyebrowStyle,
} from "@/components/shared-ui";

export default function EventBookingSection({
  eventId,
  eventName,
  priceKes,
  spotsLeft,
}: {
  eventId: string;
  eventName: string;
  priceKes: number | null;
  spotsLeft: number | null;
}) {
  const [quantity, setQuantity] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const soldOut = spotsLeft !== null && spotsLeft <= 0;

  return (
    <div style={{ background: "#fff", border: "1px solid #eee", padding: "1.6rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <p style={{ fontSize: "1.2rem", fontWeight: 500 }}>{priceKes ? `KES ${priceKes.toLocaleString()}` : "Free"}</p>
        {spotsLeft !== null && (
          <p style={{ fontSize: "0.78rem", color: soldOut ? "#b33" : "#999" }}>
            {soldOut ? "Sold out" : `${spotsLeft} tickets left`}
          </p>
        )}
      </div>

      {!soldOut && (
        <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end" }}>
          <Field label="Tickets">
            <input
              type="number"
              min={1}
              max={spotsLeft ?? 50}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              style={{ ...inputStyle, width: 80 }}
            />
          </Field>
          <button onClick={() => setShowModal(true)} style={buttonStyle}>
            {priceKes ? "Book & Pay" : "Reserve Free Tickets"}
          </button>
        </div>
      )}

      {showModal && (
        <EventBookingModal
          eventId={eventId}
          eventName={eventName}
          priceKes={priceKes}
          quantity={quantity}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

function EventBookingModal({
  eventId,
  eventName,
  priceKes,
  quantity,
  onClose,
}: {
  eventId: string;
  eventName: string;
  priceKes: number | null;
  quantity: number;
  onClose: () => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [freeSuccess, setFreeSuccess] = useState(false);

  async function handleSubmit() {
    if (!firstName || !lastName || !email || !phone) {
      setError("Please fill in all fields.");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/events/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, quantity, firstName, lastName, email, phone }),
      });
      const data = await res.json();
      if (res.ok && data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else if (res.ok) {
        setFreeSuccess(true);
      } else {
        setError(data.error || "Something went wrong. Please try again.");
        setSubmitting(false);
      }
    } catch {
      setError("Network error — please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={modalStyle}>
        <button onClick={onClose} style={closeButtonStyle} aria-label="Close">&times;</button>
        {freeSuccess ? (
          <>
            <p style={eyebrowStyle}>You&apos;re In</p>
            <h3 style={{ fontWeight: 300, fontSize: "1.3rem", color: "#292f1a", marginBottom: "0.8rem" }}>
              {quantity} ticket{quantity > 1 ? "s" : ""} reserved for {eventName}
            </h3>
            <p style={{ fontSize: "0.85rem", color: "#666" }}>A confirmation has been sent to {email}.</p>
          </>
        ) : (
          <>
            <p style={eyebrowStyle}>Confirm Your Tickets</p>
            <h3 style={{ fontWeight: 300, fontSize: "1.3rem", color: "#292f1a", marginBottom: "0.3rem" }}>{eventName}</h3>
            <p style={{ fontSize: "0.78rem", color: "#999", marginBottom: "1.4rem" }}>
              {quantity} ticket{quantity > 1 ? "s" : ""}
              {priceKes ? ` · KES ${(priceKes * quantity).toLocaleString()} total` : " · Free"}
            </p>
            <div style={{ display: "flex", gap: "0.7rem", marginBottom: "0.9rem" }}>
              <input placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
              <input placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
            </div>
            <input placeholder="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ ...inputStyle, width: "100%", marginBottom: "0.9rem" }} />
            <input placeholder="Phone (e.g. 2547XXXXXXXX)" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ ...inputStyle, width: "100%", marginBottom: "1.2rem" }} />
            <button onClick={handleSubmit} disabled={submitting} style={{ ...buttonStyle, width: "100%" }}>
              {submitting ? "Please wait…" : priceKes ? "Continue to Payment" : "Reserve Tickets"}
            </button>
            {error && <p style={{ color: "#b33", fontSize: "0.75rem", marginTop: "0.7rem" }}>{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}
