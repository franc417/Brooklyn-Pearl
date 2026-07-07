-- ============================================================================
-- Brooklyn Pearl Resort — Phase 8 Migration
-- Pesapal's refund endpoint identifies a payment by its confirmation_code,
-- not the order_tracking_id we've been using everywhere else -- this column
-- stores it once available (from GetTransactionStatus) so a refund can
-- actually be requested later without re-deriving it from raw_response jsonb.
-- ============================================================================

alter table payments add column confirmation_code text;
