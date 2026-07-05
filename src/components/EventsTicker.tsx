"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface TickerEvent {
  name: string;
  slug: string;
  event_date: string;
}

// Inserted ABOVE the preserved homepage markup in page.tsx, not inside it —
// the approved design stays byte-for-byte untouched; this is purely additive.
export default function EventsTicker({ events }: { events: TickerEvent[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (events.length <= 1) return;
    const interval = setInterval(() => setIndex((i) => (i + 1) % events.length), 5000);
    return () => clearInterval(interval);
  }, [events.length]);

  if (events.length === 0) return null;
  const current = events[index];

  return (
    <div
      style={{
        background: "#292f1a",
        color: "#fff",
        textAlign: "center",
        padding: "0.55rem 1rem",
        fontFamily: "'Montserrat', sans-serif",
        fontSize: "0.78rem",
        position: "relative",
        zIndex: 1001,
      }}
    >
      <Link href={`/events/${current.slug}`} style={{ color: "#fff", textDecoration: "none" }}>
        <span style={{ color: "#c4a06e", letterSpacing: "0.1em", textTransform: "uppercase", fontSize: "0.65rem", marginRight: "0.6rem" }}>
          Happening Soon
        </span>
        {current.name}
        {" · "}
        {new Date(current.event_date).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}
        <span style={{ marginLeft: "0.5rem" }}>→</span>
      </Link>
    </div>
  );
}
