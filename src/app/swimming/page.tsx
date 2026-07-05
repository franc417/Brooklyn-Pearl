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
import FeaturedEventPopup from "@/components/FeaturedEventPopup";
import OfferEligibilityBanner from "@/components/OfferEligibilityBanner";

interface SwimmingOption {
  sessionId: string;
  startTime: string;
  endTime: string;
  pricePerPersonKes: number;
  totalKes: number;
  spotsLeft: number;
}

export default function SwimmingPage() {
  const [date, setDate] = useState("");
  const [partySize, setPartySize] = useState(1);
  const [options, setOptions] = useState<SwimmingOption[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOption, setModalOption] = useState<SwimmingOption | null>(null);

  async function checkAvailability() {
    if (!date) {
      setError("Please choose a date.");
      return;
    }
    setSearching(true);
    setError(null);
    setOptions(null);

    try {
      const params = new URLSearchParams({ date, partySize: String(partySize) });
      const res = await fetch(`/api/swimming/availability?${params}`);
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
      <PageHeader title="Swimming" tagline="Book a session by the pool" />

      <section style={{ maxWidth: 720, margin: "0 auto", padding: "2.5rem 1.5rem" }}>
        <div style={{ background: "#fff", padding: "1.8rem", border: "1px solid #eee", marginBottom: "2rem" }}>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "flex-end" }}>
            <Field label="Date">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Guests">
              <input
                type="number"
                min={1}
                max={30}
                value={partySize}
                onChange={(e) => setPartySize(Number(e.target.value))}
                style={{ ...inputStyle, width: 80 }}
              />
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
              <p style={{ color: "#999" }}>No sessions with enough spots on that date — try another day.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                {options.map((opt) => (
                  <div
                    key={opt.sessionId}
                    style={{ background: "#fff", border: "1px solid #eee", padding: "1.2rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.8rem" }}
                  >
                    <div>
                      <p style={{ fontWeight: 500 }}>{opt.startTime}–{opt.endTime}</p>
                      <p style={{ fontSize: "0.78rem", color: "#999" }}>
                        {opt.spotsLeft} spots left · KES {opt.pricePerPersonKes.toLocaleString()}/person
                      </p>
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
        <SwimmingBookingModal option={modalOption} partySize={partySize} date={date} onClose={() => setModalOption(null)} />
      )}
    </main>
  );
}

function SwimmingBookingModal({
  option,
  partySize,
  date,
  onClose,
}: {
  option: SwimmingOption;
  partySize: number;
  date: string;
  onClose: () => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [claimedOfferId, setClaimedOfferId] = useState<string | null>(null);
  const [rewardSuccess, setRewardSuccess] = useState(false);

  async function handleSubmit() {
    if (!firstName || !lastName || !email || !phone) {
      setError("Please fill in all fields.");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/swimming/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: option.sessionId, partySize, firstName, lastName, email, phone, claimedOfferId: claimedOfferId ?? undefined }),
      });
      const data = await res.json();
      if (res.ok && data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else if (res.ok && data.loyaltyReward) {
        setRewardSuccess(true);
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
        {rewardSuccess ? (
          <>
            <p style={eyebrowStyle}>Loyalty Reward Applied</p>
            <h3 style={{ fontWeight: 300, fontSize: "1.3rem", color: "#292f1a", marginBottom: "0.8rem" }}>
              Your free session is booked 🎉
            </h3>
            <p style={{ fontSize: "0.85rem", color: "#666" }}>
              Swimming — {option.startTime}–{option.endTime}. A confirmation has been sent to {email}.
            </p>
          </>
        ) : (
          <>
            <p style={eyebrowStyle}>Confirm Your Booking</p>
            <h3 style={{ fontWeight: 300, fontSize: "1.3rem", color: "#292f1a", marginBottom: "0.3rem" }}>
              Swimming — {option.startTime}–{option.endTime}
            </h3>
            <p style={{ fontSize: "0.78rem", color: "#999", marginBottom: "1.4rem" }}>
              {partySize} {partySize > 1 ? "people" : "person"} · KES {option.totalKes.toLocaleString()} total
            </p>
            <FeaturedEventPopup />
            <OfferEligibilityBanner
              partySize={partySize}
              date={date}
              serviceCategory="swimming"
              claimedOfferId={claimedOfferId}
              onClaim={setClaimedOfferId}
            />
            <div style={{ display: "flex", gap: "0.7rem", marginBottom: "0.9rem" }}>
              <input placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
              <input placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
            </div>
            <input placeholder="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ ...inputStyle, width: "100%", marginBottom: "0.9rem" }} />
            <input placeholder="Phone (e.g. 2547XXXXXXXX)" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ ...inputStyle, width: "100%", marginBottom: "1.2rem" }} />
            <button onClick={handleSubmit} disabled={submitting} style={{ ...buttonStyle, width: "100%" }}>
              {submitting ? "Please wait…" : "Continue to Payment"}
            </button>
            {error && <p style={{ color: "#b33", fontSize: "0.75rem", marginTop: "0.7rem" }}>{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}
