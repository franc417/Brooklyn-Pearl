-- ============================================================================
-- Brooklyn Pearl Resort — Offer Redemption Guest Info Migration
-- Every other booking-like table (bookings, swimming_bookings,
-- restaurant_reservations, conference_bookings, event_bookings) snapshots
-- guest_first_name/guest_last_name/guest_email directly on the row, since
-- guest_id is nullable (anonymous checkout is allowed everywhere) and a
-- booking record needs to stay meaningful even without a linked account.
-- offer_redemptions never got this when it was first built — fixing that
-- inconsistency here rather than trying to resolve guest identity via a
-- join through applied_to_table/applied_to_id at query time, which would
-- be fragile (different join logic needed per source table) and slower.
--
-- Existing rows will have NULL here — there's no way to backfill guest
-- info that was never captured. Going forward, every insert path sets
-- these explicitly (see api/restaurant/reservations and
-- lib/bookingConfirmation.ts).
-- ============================================================================

alter table offer_redemptions add column guest_first_name text;
alter table offer_redemptions add column guest_last_name text;
alter table offer_redemptions add column guest_email text;
