"use client";

import { useEffect, useState } from "react";

interface FeaturedEvent {
  name: string;
  slug: string;
  event_date: string;
  price_kes: number | null;
}

// Shown inside checkout modals across services, per the brief: "a short
// summary popup should appear... noticeable but not annoying." Self-fetches
// so it can just be dropped into any modal without prop drilling. Dismissed
// state is per-mount (reappears next time a modal opens) — deliberately not
// persisted, since the goal is a gentle nudge each checkout, not a one-time
// notice that's gone forever after the first dismissal.
export default function FeaturedEventPopup() {
  const [event, setEvent] = useState<FeaturedEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/events")
      .then((res) => res.json())
      .then((data) => {
        const featured = (data.events ?? []).find((e: { is_featured: boolean }) => e.is_featured);
        if (featured) setEvent(featured);
      })
      .catch(() => {});
  }, []);

  if (!event || dismissed) return null;

  return (
    <div
      style={{
        background: "#fdf6ec",
        border: "1px solid #e8d4b0",
        padding: "0.7rem 0.9rem",
        marginBottom: "1rem",
        fontSize: "0.78rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "0.6rem",
      }}
    >
      <span>
        🎉 Also happening: <strong>{event.name}</strong> on{" "}
        {new Date(event.event_date).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}
        {event.price_kes ? ` · KES ${event.price_kes.toLocaleString()}` : " · Free"} —{" "}
        <a href={`/events/${event.slug}`} style={{ color: "#a47f50" }}>view details</a>
      </span>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        style={{ background: "none", border: "none", cursor: "pointer", color: "#999", fontSize: "1rem", flexShrink: 0 }}
      >
        &times;
      </button>
    </div>
  );
}
