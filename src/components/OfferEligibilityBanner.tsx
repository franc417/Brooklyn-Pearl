"use client";

import { useEffect, useState } from "react";
import { evaluateOfferCriteria, type OfferCriteria } from "@/lib/offerRules";

interface Offer {
  id: string;
  title: string;
  reward_description: string;
  qualifying_criteria: OfferCriteria;
}

/**
 * Checks active offers against the current booking context and lets the
 * guest flag that they'd like to claim one. This does NOT change the price
 * charged online — see the Phase 5 commit notes on why: the example offer
 * (free soda) is a reward redeemed in person, not an online discount.
 * Claiming here just logs an offer_redemptions row so staff can honor it.
 */
export default function OfferEligibilityBanner({
  partySize,
  date,
  serviceCategory,
  claimedOfferId,
  onClaim,
}: {
  partySize: number;
  date: string;
  serviceCategory: string;
  claimedOfferId: string | null;
  onClaim: (offerId: string | null) => void;
}) {
  const [matches, setMatches] = useState<Offer[]>([]);

  useEffect(() => {
    if (!date) return;
    fetch("/api/offers")
      .then((res) => res.json())
      .then((data) => {
        const eligible = (data.offers ?? []).filter((o: Offer) =>
          evaluateOfferCriteria(o.qualifying_criteria ?? {}, { partySize, date, serviceCategory })
        );
        setMatches(eligible);
      })
      .catch(() => {});
  }, [partySize, date, serviceCategory]);

  if (matches.length === 0) return null;

  return (
    <div style={{ background: "#fdf6ec", border: "1px solid #e8d4b0", padding: "0.7rem 0.9rem", marginBottom: "1rem", fontSize: "0.78rem" }}>
      {matches.map((offer) => (
        <label key={offer.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={claimedOfferId === offer.id}
            onChange={(e) => onClaim(e.target.checked ? offer.id : null)}
          />
          <span>
            🎁 You qualify for <strong>{offer.title}</strong> — {offer.reward_description}
          </span>
        </label>
      ))}
    </div>
  );
}
