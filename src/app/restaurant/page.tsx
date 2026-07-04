"use client";

import { useEffect, useState } from "react";
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

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price_kes: number;
  category: string;
}

interface TableOption {
  tableId: string;
  tableNumber: string;
  seats: number;
  reservationStart: string;
  reservationEnd: string;
}

export default function RestaurantPage() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [partySize, setPartySize] = useState(2);
  const [options, setOptions] = useState<TableOption[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOption, setModalOption] = useState<TableOption | null>(null);
  const [reservedMessage, setReservedMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/menu")
      .then((res) => res.json())
      .then((data) => setMenu(data.items ?? []))
      .catch(() => setMenu([]));
  }, []);

  async function checkAvailability() {
    if (!date || !time) {
      setError("Please choose a date and time.");
      return;
    }
    setSearching(true);
    setError(null);
    setOptions(null);

    try {
      const params = new URLSearchParams({ date, time, partySize: String(partySize) });
      const res = await fetch(`/api/restaurant/availability?${params}`);
      const data = await res.json();
      setOptions(data.options ?? []);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSearching(false);
    }
  }

  const menuByCategory = menu.reduce<Record<string, MenuItem[]>>((acc, item) => {
    (acc[item.category] ??= []).push(item);
    return acc;
  }, {});

  return (
    <main style={{ fontFamily: "'Montserrat', sans-serif", minHeight: "100vh", background: "#f8f4ee" }}>
      <PageHeader title="Restaurant" tagline="Reserve a table — browse the menu below" />

      <section style={{ maxWidth: 720, margin: "0 auto", padding: "2.5rem 1.5rem" }}>
        {reservedMessage && (
          <div style={{ background: "#eaf4ea", border: "1px solid #bfe0bf", color: "#2f6b3a", padding: "1rem 1.2rem", marginBottom: "1.5rem", fontSize: "0.85rem" }}>
            {reservedMessage}
          </div>
        )}

        <div style={{ background: "#fff", padding: "1.8rem", border: "1px solid #eee", marginBottom: "2rem" }}>
          <p style={{ fontSize: "0.9rem", fontWeight: 500, marginBottom: "1rem", color: "#292f1a" }}>Reserve a table</p>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "flex-end" }}>
            <Field label="Date">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Time">
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Party">
              <input type="number" min={1} max={20} value={partySize} onChange={(e) => setPartySize(Number(e.target.value))} style={{ ...inputStyle, width: 70 }} />
            </Field>
            <button onClick={checkAvailability} disabled={searching} style={buttonStyle}>
              {searching ? "Checking…" : "Check Availability"}
            </button>
          </div>
          {error && <p style={{ color: "#b33", fontSize: "0.82rem", marginTop: "0.8rem" }}>{error}</p>}
        </div>

        {options !== null && (
          <div style={{ marginBottom: "2.5rem" }}>
            {options.length === 0 ? (
              <p style={{ color: "#999" }}>No tables free for that time — try a different slot.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                {options.map((opt) => (
                  <div key={opt.tableId} style={{ background: "#fff", border: "1px solid #eee", padding: "1.2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <p style={{ fontWeight: 500 }}>Table {opt.tableNumber}</p>
                      <p style={{ fontSize: "0.78rem", color: "#999" }}>Seats up to {opt.seats}</p>
                    </div>
                    <button onClick={() => setModalOption(opt)} style={buttonStyle}>Reserve</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div>
          <p style={{ fontSize: "0.9rem", fontWeight: 500, marginBottom: "1rem", color: "#292f1a" }}>Menu</p>
          {Object.keys(menuByCategory).length === 0 ? (
            <p style={{ color: "#999" }}>Menu coming soon.</p>
          ) : (
            Object.entries(menuByCategory).map(([category, items]) => (
              <div key={category} style={{ marginBottom: "1.5rem" }}>
                <p style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#a47f50", marginBottom: "0.6rem" }}>{category}</p>
                {items.map((item) => (
                  <div key={item.id} style={{ display: "flex", justifyContent: "space-between", padding: "0.6rem 0", borderBottom: "1px solid #eee" }}>
                    <div>
                      <p style={{ fontSize: "0.88rem" }}>{item.name}</p>
                      {item.description && <p style={{ fontSize: "0.75rem", color: "#999" }}>{item.description}</p>}
                    </div>
                    <p style={{ fontSize: "0.85rem", whiteSpace: "nowrap", marginLeft: "1rem" }}>KES {item.price_kes.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </section>

      {modalOption && (
        <ReservationModal
          option={modalOption}
          partySize={partySize}
          date={date}
          onClose={() => setModalOption(null)}
          onReserved={(msg) => {
            setModalOption(null);
            setOptions(null);
            setReservedMessage(msg);
          }}
        />
      )}
    </main>
  );
}

function ReservationModal({
  option,
  partySize,
  date,
  onClose,
  onReserved,
}: {
  option: TableOption;
  partySize: number;
  date: string;
  onClose: () => void;
  onReserved: (message: string) => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [claimedOfferId, setClaimedOfferId] = useState<string | null>(null);

  async function handleSubmit() {
    if (!firstName || !lastName || !email || !phone) {
      setError("Please fill in all fields.");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/restaurant/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId: option.tableId,
          reservationStart: option.reservationStart,
          reservationEnd: option.reservationEnd,
          partySize,
          firstName,
          lastName,
          email,
          phone,
          specialRequests: specialRequests || undefined,
          claimedOfferId: claimedOfferId ?? undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        onReserved(`Table ${option.tableNumber} is reserved — a confirmation has been sent to ${email}.`);
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
        <p style={eyebrowStyle}>Confirm Your Reservation</p>
        <h3 style={{ fontWeight: 300, fontSize: "1.3rem", color: "#292f1a", marginBottom: "0.3rem" }}>
          Table {option.tableNumber}
        </h3>
        <p style={{ fontSize: "0.78rem", color: "#999", marginBottom: "1.4rem" }}>
          {new Date(option.reservationStart).toLocaleString("en-KE", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
          {" · "}{partySize} guests · No payment required online
        </p>
        <FeaturedEventPopup />
        <OfferEligibilityBanner
          partySize={partySize}
          date={date}
          serviceCategory="restaurant"
          claimedOfferId={claimedOfferId}
          onClaim={setClaimedOfferId}
        />
        <div style={{ display: "flex", gap: "0.7rem", marginBottom: "0.9rem" }}>
          <input placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
          <input placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
        </div>
        <input placeholder="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ ...inputStyle, width: "100%", marginBottom: "0.9rem" }} />
        <input placeholder="Phone (e.g. 2547XXXXXXXX)" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ ...inputStyle, width: "100%", marginBottom: "0.9rem" }} />
        <textarea
          placeholder="Special requests (optional)"
          value={specialRequests}
          onChange={(e) => setSpecialRequests(e.target.value)}
          style={{ ...inputStyle, width: "100%", minHeight: 60, marginBottom: "1.2rem", fontFamily: "inherit" }}
        />
        <button onClick={handleSubmit} disabled={submitting} style={{ ...buttonStyle, width: "100%" }}>
          {submitting ? "Please wait…" : "Confirm Reservation"}
        </button>
        {error && <p style={{ color: "#b33", fontSize: "0.75rem", marginTop: "0.7rem" }}>{error}</p>}
      </div>
    </div>
  );
}
