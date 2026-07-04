-- ============================================================================
-- Brooklyn Pearl Resort — Phase 5 Migration
-- Swimming bookings go through Pesapal, so a claimed offer can't be logged
-- to offer_redemptions at creation time -- the payment might still fail.
-- This column holds the claim until confirmBookingSource() transitions the
-- booking to 'confirmed', at which point the redemption is actually logged.
-- Restaurant reservations don't need this: they confirm instantly (no
-- payment gate), so they log directly at creation time.
-- ============================================================================

alter table swimming_bookings add column claimed_offer_id uuid references offers(id);
