-- Run this in Supabase SQL Editor to see exactly which migrations have
-- actually been applied. Each row should say "present" — if any say
-- "MISSING", run that migration file before testing the related feature.

select
  'Migration 002 (Phase 2: BnB/Swimming/Restaurant/Events/Offers/Loyalty)' as migration,
  case when exists (select 1 from information_schema.tables where table_name = 'swimming_sessions')
    then 'present' else 'MISSING' end as status
union all
select
  'Migration 003 (Phase 3: polymorphic payments)',
  case when exists (select 1 from information_schema.columns where table_name = 'payments' and column_name = 'source_table')
    then 'present' else 'MISSING' end
union all
select
  'Migration 004 (Phase 5: swimming offer claims)',
  case when exists (select 1 from information_schema.columns where table_name = 'swimming_bookings' and column_name = 'claimed_offer_id')
    then 'present' else 'MISSING' end
union all
select
  'Migration 005 (Phase 6: loyalty)',
  case when exists (select 1 from information_schema.tables where table_name = 'loyalty_counters')
    then 'present' else 'MISSING' end
union all
select
  'Migration 006 (Phase 8: refunds)',
  case when exists (select 1 from information_schema.columns where table_name = 'payments' and column_name = 'confirmation_code')
    then 'present' else 'MISSING' end
union all
select
  'Migration 007 (Conference Hall)',
  case when exists (select 1 from information_schema.tables where table_name = 'conference_rooms')
    then 'present' else 'MISSING' end
union all
select
  'Migration 008 (Ticket verification)',
  case when exists (select 1 from information_schema.columns where table_name = 'event_bookings' and column_name = 'ticket_number')
    then 'present' else 'MISSING' end
union all
select
  'Migration 009 (Offer redemption guest info)',
  case when exists (select 1 from information_schema.columns where table_name = 'offer_redemptions' and column_name = 'guest_first_name')
    then 'present' else 'MISSING' end;
