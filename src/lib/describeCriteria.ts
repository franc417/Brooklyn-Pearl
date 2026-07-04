import type { OfferCriteria } from "./offerRules";

const CATEGORY_LABELS: Record<string, string> = {
  hotel: "Hotel stays",
  bnb: "BnB stays",
  swimming: "Swimming",
  restaurant: "Restaurant",
};

/** Turns qualifying_criteria jsonb into plain-English bullet points for the offer detail page. */
export function describeCriteria(criteria: OfferCriteria): string[] {
  const lines: string[] = [];

  if (criteria.min_party_size) {
    lines.push(`Groups of ${criteria.min_party_size} or more`);
  }
  if (criteria.days_of_week && criteria.days_of_week.length > 0) {
    const days = criteria.days_of_week.map((d) => d.charAt(0).toUpperCase() + d.slice(1));
    lines.push(days.length === 1 ? `${days[0]}s only` : days.join(", "));
  }
  if (criteria.service_category) {
    lines.push(CATEGORY_LABELS[criteria.service_category] ?? criteria.service_category);
  }
  if (lines.length === 0) {
    lines.push("Open to all guests");
  }

  return lines;
}
