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
  roomId: string;
  name: string;
  capacity: number;
  amenities: string[];
  totalKes: number;
  bookingStart: string;
  bookingEnd: string;
}

export default function ConferencePage() {
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [durationHours, setDurationHours] = useState(2);
  const [attendeeCount, setAttendeeCount] = useState(10);
  const [options, setOptions] = useState<RoomOption[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOption, setModalOption] = useState<RoomOption | null>(null);

  async function checkAvailability() {
    if (!date || !startTime) {
      setError("Please choose a date and start time.");
      return;
    }
    setSearching(true);
    setError(null);
    setOptions(null);

    try {
      const params = new URLSearchParams({ date, startTime, durationHours: String(durationHours), attendeeCount: String(attendeeCount) });
      const res = await fetch(`/api/conference/availability?${params}`);
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
      <PageHeader title="Conference Hall" tagline="Meeting and event spaces for business gatherings" />

      <section style={{ maxWidth: 720, margin: "0 auto", padding: "2.5rem 1.5rem" }}>
        <div style={{ background: "#fff", padding: "1.8rem", border: "1px solid #eee", marginBottom: "2rem" }}>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "flex-end" }}>
            <Field label="Date">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Start Time">
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Hours">
              <input type="number" min={1} max={12} value={durationHours} onChange={(e) => setDurationHours(Number(e.target.value))} style={{ ...inputStyle, width: 70 }} />
            </Field>
            <Field label="Attendees">
              <input type="number" min={1} max={200} value={attendeeCount} onChange={(e) => setAttendeeCount(Number(e.target.value))} style={{ ...inputStyle, width: 80 }} />
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
              <p style={{ color: "#999" }}>No rooms available for that time — try adjusting your search.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                {options.map((opt) => (
                  <div key={opt.roomId} style={{ background: "#fff", border: "1px solid #eee", padding: "1.2rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.8rem" }}>
                    <div>
                      <p style={{ fontWeight: 500 }}>{opt.name}</p>
                      <p style={{ fontSize: "0.78rem", color: "#999" }}>Seats up to {opt.capacity}{opt.amenities?.length ? ` · ${opt.amenities.join(", ")}` : ""}</p>
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
        <ConferenceBookingModal option={modalOption} attendeeCount={attendeeCount} onClose={() => setModalOption(null)} />
      )}
    </main>
  );
}

function ConferenceBookingModal({
  option,
  attendeeCount,
  onClose,
}: {
  option: RoomOption;
  attendeeCount: number;
  onClose: () => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "mpesa">("card");
  const [waitingForMpesa, setWaitingForMpesa] = useState(false);
  const [success, setSuccess] = useState(false);

  async function pollMpesaStatus(checkoutRequestId: string) {
    for (let attempt = 0; attempt < 30; attempt++) {
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
      const res = await fetch("/api/conference/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: option.roomId,
          bookingStart: option.bookingStart,
          bookingEnd: option.bookingEnd,
          attendeeCount,
          firstName,
          lastName,
          email,
          phone,
          organizationName: organizationName || undefined,
          purpose: purpose || undefined,
          paymentMethod,
        }),
      });
      const data = await res.json();
      if (res.ok && data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else if (res.ok && data.mpesaPending) {
        setWaitingForMpesa(true);
        pollMpesaStatus(data.checkoutRequestId);
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
              Your room is booked 🎉
            </h3>
            <p style={{ fontSize: "0.85rem", color: "#666" }}>{option.name} is reserved. A confirmation has been sent to {email}.</p>
          </>
        ) : waitingForMpesa ? (
          <>
            <p style={eyebrowStyle}>Check Your Phone</p>
            <h3 style={{ fontWeight: 300, fontSize: "1.3rem", color: "#292f1a", marginBottom: "0.8rem" }}>
              Enter your M-Pesa PIN to complete payment
            </h3>
            <p style={{ fontSize: "0.85rem", color: "#666" }}>A payment prompt for KES {option.totalKes.toLocaleString()} was sent to {phone}.</p>
          </>
        ) : (
          <>
            <p style={eyebrowStyle}>Confirm Your Booking</p>
            <h3 style={{ fontWeight: 300, fontSize: "1.3rem", color: "#292f1a", marginBottom: "0.3rem" }}>{option.name}</h3>
            <p style={{ fontSize: "0.78rem", color: "#999", marginBottom: "1.4rem" }}>
              {attendeeCount} attendees · KES {option.totalKes.toLocaleString()} total
            </p>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.9rem" }}>
              <button type="button" onClick={() => setPaymentMethod("card")} style={{ ...buttonStyle, flex: 1, background: paymentMethod === "card" ? "#a47f50" : "transparent", color: paymentMethod === "card" ? "#fff" : "#a47f50", border: "1px solid #a47f50" }}>Card</button>
              <button type="button" onClick={() => setPaymentMethod("mpesa")} style={{ ...buttonStyle, flex: 1, background: paymentMethod === "mpesa" ? "#a47f50" : "transparent", color: paymentMethod === "mpesa" ? "#fff" : "#a47f50", border: "1px solid #a47f50" }}>M-Pesa</button>
            </div>
            <input placeholder="Organization (optional)" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} style={{ ...inputStyle, width: "100%", marginBottom: "0.9rem" }} />
            <div style={{ display: "flex", gap: "0.7rem", marginBottom: "0.9rem" }}>
              <input placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
              <input placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
            </div>
            <input placeholder="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ ...inputStyle, width: "100%", marginBottom: "0.9rem" }} />
            <input placeholder="Phone (e.g. 2547XXXXXXXX)" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ ...inputStyle, width: "100%", marginBottom: "0.9rem" }} />
            <textarea placeholder="Purpose of booking (optional)" value={purpose} onChange={(e) => setPurpose(e.target.value)} style={{ ...inputStyle, width: "100%", minHeight: 60, marginBottom: "1.2rem", fontFamily: "inherit" }} />
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
