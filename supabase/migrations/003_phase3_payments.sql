-- ============================================================================
-- Brooklyn Pearl Resort — Phase 3 Migration
-- Makes `payments` polymorphic: Phase 0 hardcoded it to reference `bookings`
-- only. Swimming and restaurant bookings live in their own tables, so a
-- single Postgres foreign key can't cover all three — same problem
-- offer_redemptions already solved in Phase 2, reused here.
-- ============================================================================

alter table payments drop constraint if exists payments_booking_id_fkey;
alter table payments rename column booking_id to source_id;
alter table payments add column source_table text not null default 'bookings';
alter table payments alter column source_table drop default;

drop index if exists idx_payments_booking; -- superseded by idx_payments_source below
create index idx_payments_source on payments (source_table, source_id);
