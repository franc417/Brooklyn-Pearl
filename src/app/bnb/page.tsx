"use client";

import { useState } from "react";
import {
  PageHeader,
  Field,
  inputStyle,
  buttonStyle,
  overlayStyle,
  modalStyle,
  closeButtonStyle,
  eyebrowStyle,
} from "@/components/shared-ui";

interface RoomOption {
  roomTypeId: string;
  name: string;
  totalKes: number;
  nights: number;
  unitsAvailable: number;
  coverImageUrl: string | null;
}

// Reuses the exact same /api/availability and /api/bookings endpoints as
// the hotel booking bar on the homepage — the only difference is the
// category=bnb filter, since BnB and Hotel share the same room_types/
// room_units/bookings tables and the same double-booking protection.
export default function BnbPage() {
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);
  const [options, setOptions] = useState<RoomOption[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOption, setModalOption] = useState<RoomOption | null>(null);

  async function checkAvailability() {
    if (!checkIn || !checkOut) {
      setError("Please choose your check-in and check-out dates.");
      return;
    }
    if (checkOut <= checkIn) {
      setError("Check-out must be after check-in.");
      return;
    }
    setSearching(true);
    setError(null);
    setOptions(null);

    try {
      const params = new URLSearchParams({ checkIn, checkOut, guests: String(guests), category: "bnb" });
      const res = await fetch(`/api/availability?${params}`);
      const data = await res.json();
      setOptions(data.options ?? []);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSearching(false);
    }
  }

  return (
    <main style={{ fontFamily: "'Montserrat', sans-serif", minHeight: "100vh", background: "#f8f4ee" }}>
      <PageHeader title="BnB Accommodation" tagline="Self-contained stays with a residential feel" />

      <section style={{ maxWidth: 720, margin: "0 auto", padding: "2.5rem 1.5rem" }}>
        <div style={{ background: "#fff", padding: "1.8rem", border: "1px solid #eee", marginBottom: "2rem" }}>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "flex-end" }}>
            <Field label="Check-in">
              <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Check-out">
              <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Guests">
              <input type="number" min={1} max={12} value={guests} onChange={(e) => setGuests(Number(e.target.value))} style={{ ...inputStyle, width: 70 }} />
            </Field>
            <button onClick={checkAvailability} disabled={searching} style={buttonStyle}>
              {searching ? "Checking…" : "Check Availability"}
            </button>
          </div>
          {error && <p style={{ color: "#b33", fontSize: "0.82rem", marginTop: "0.8rem" }}>{error}</p>}
        </div>

        {options !== null && (
          <div>
            {options.length === 0 ? (
              <p style={{ color: "#999" }}>No BnB units available for those dates — try adjusting your search.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                {options.map((opt) => (
                  <div key={opt.roomTypeId} style={{ background: "#fff", border: "1px solid #eee", padding: "1.2rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.8rem" }}>
                    <div>
                      <p style={{ fontWeight: 500 }}>{opt.name}</p>
                      <p style={{ fontSize: "0.78rem", color: "#999" }}>{opt.unitsAvailable} available · {opt.nights} nights</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <p style={{ fontWeight: 600 }}>KES {opt.totalKes.toLocaleString()} total</p>
                      <button onClick={() => setModalOption(opt)} style={buttonStyle}>Book</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {modalOption && (
        <BnbBookingModal
          option={modalOption}
          checkIn={checkIn}
          checkOut={checkOut}
          guests={guests}
          onClose={() => setModalOption(null)}
        />
      )}
    </main>
  );
}

function BnbBookingModal({
  option,
  checkIn,
  checkOut,
  guests,
  onClose,
}: {
  option: RoomOption;
  checkIn: string;
  checkOut: string;
  guests: number;
  onClose: () => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "mpesa">("card");
  const [waitingForMpesa, setWaitingForMpesa] = useState(false);
  const [success, setSuccess] = useState(false);

  async function pollMpesaStatus(checkoutRequestId: string) {
    const maxAttempts = 30;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((r) => setTimeout(r, 3000));
      try {
        const res = await fetch(`/api/payments/mpesa/status?checkoutRequestId=${checkoutRequestId}`);
        const data = await res.json();
        if (data.status === "completed") {
          setWaitingForMpesa(false);
          setSuccess(true);
          return;
        }
        if (data.status === "failed") {
          setWaitingForMpesa(false);
          setError("Payment wasn't completed on M-Pesa. Please try again.");
          setSubmitting(false);
          return;
        }
      } catch {
        // transient — retry next tick
      }
    }
    setWaitingForMpesa(false);
    setError("Still waiting on M-Pesa confirmation. Check your phone, or try again.");
    setSubmitting(false);
  }

  async function handleSubmit() {
    if (!firstName || !lastName || !email || !phone) {
      setError("Please fill in all fields.");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomTypeId: option.roomTypeId,
          checkIn,
          checkOut,
          guests,
          firstName,
          lastName,
          email,
          phone,
          paymentMethod,
        }),
      });
      const data = await res.json();
      if (res.ok && data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else if (res.ok && data.mpesaPending) {
        setWaitingForMpesa(true);
        pollMpesaStatus(data.checkoutRequestId);
      } else if (res.ok && (data.loyaltyReward || data.status === "confirmed")) {
        setSuccess(true);
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
        {success ? (
          <>
            <p style={eyebrowStyle}>Booking Confirmed</p>
            <h3 style={{ fontWeight: 300, fontSize: "1.3rem", color: "#292f1a", marginBottom: "0.8rem" }}>
              You&apos;re all set 🎉
            </h3>
            <p style={{ fontSize: "0.85rem", color: "#666" }}>
              {option.name} · {checkIn} → {checkOut}. A confirmation has been sent to {email}.
            </p>
          </>
        ) : waitingForMpesa ? (
          <>
            <p style={eyebrowStyle}>Check Your Phone</p>
            <h3 style={{ fontWeight: 300, fontSize: "1.3rem", color: "#292f1a", marginBottom: "0.8rem" }}>
              Enter your M-Pesa PIN to complete payment
            </h3>
            <p style={{ fontSize: "0.85rem", color: "#666" }}>
              A payment prompt for KES {option.totalKes.toLocaleString()} was sent to {phone}.
            </p>
          </>
        ) : (
          <>
            <p style={eyebrowStyle}>Confirm Your Booking</p>
            <h3 style={{ fontWeight: 300, fontSize: "1.3rem", color: "#292f1a", marginBottom: "0.3rem" }}>{option.name}</h3>
            <p style={{ fontSize: "0.78rem", color: "#999", marginBottom: "1.4rem" }}>
              {checkIn} → {checkOut} · KES {option.totalKes.toLocaleString()} total
            </p>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.9rem" }}>
              <button type="button" onClick={() => setPaymentMethod("card")} style={{ ...buttonStyle, flex: 1, background: paymentMethod === "card" ? "#a47f50" : "transparent", color: paymentMethod === "card" ? "#fff" : "#a47f50", border: "1px solid #a47f50" }}>Card</button>
              <button type="button" onClick={() => setPaymentMethod("mpesa")} style={{ ...buttonStyle, flex: 1, background: paymentMethod === "mpesa" ? "#a47f50" : "transparent", color: paymentMethod === "mpesa" ? "#fff" : "#a47f50", border: "1px solid #a47f50" }}>M-Pesa</button>
            </div>
            <div style={{ display: "flex", gap: "0.7rem", marginBottom: "0.9rem" }}>
              <input placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
              <input placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
            </div>
            <input placeholder="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ ...inputStyle, width: "100%", marginBottom: "0.9rem" }} />
            <input placeholder="Phone (e.g. 2547XXXXXXXX)" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ ...inputStyle, width: "100%", marginBottom: "1.2rem" }} />
            <button onClick={handleSubmit} disabled={submitting} style={{ ...buttonStyle, width: "100%" }}>
              {submitting ? "Please wait…" : paymentMethod === "mpesa" ? "Pay with M-Pesa" : "Continue to Payment"}
            </button>
            {error && <p style={{ color: "#b33", fontSize: "0.75rem", marginTop: "0.7rem" }}>{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}
