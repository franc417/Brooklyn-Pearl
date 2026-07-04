/**
 * Pure evaluator for an offer's qualifying_criteria (see schema.sql /
 * migrations/002_phase2.sql for the documented jsonb shape). Kept as a
 * standalone, dependency-free function so it's trivial to unit test and
 * reuse from any checkout flow (swimming, restaurant, and whatever comes
 * later) without duplicating the matching logic.
 */

export interface OfferCriteria {
  min_party_size?: number;
  days_of_week?: string[]; // lowercase, e.g. ["saturday", "sunday"]
  service_category?: string; // 'hotel' | 'bnb' | 'swimming' | 'restaurant'
}

export interface BookingContext {
  partySize: number;
  date: string; // YYYY-MM-DD
  serviceCategory: string;
}

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export function evaluateOfferCriteria(criteria: OfferCriteria, context: BookingContext): boolean {
  if (criteria.min_party_size !== undefined && context.partySize < criteria.min_party_size) {
    return false;
  }

  if (criteria.days_of_week && criteria.days_of_week.length > 0) {
    const dayName = DAY_NAMES[new Date(`${context.date}T00:00:00`).getDay()];
    if (!criteria.days_of_week.map((d) => d.toLowerCase()).includes(dayName)) {
      return false;
    }
  }

  if (criteria.service_category && criteria.service_category !== context.serviceCategory) {
    return false;
  }

  return true;
}
