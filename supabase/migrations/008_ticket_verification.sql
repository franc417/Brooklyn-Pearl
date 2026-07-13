-- ============================================================================
-- Brooklyn Pearl Resort — Ticket Verification Migration
-- Generated via a trigger, not application code, for the same reason as the
-- Phase 2 loyalty counters: a ticket number is bookkeeping that should never
-- depend on every future API route remembering to set it correctly.
-- ============================================================================

alter table event_bookings add column ticket_number text unique;
alter table event_bookings add column verification_code text;
alter table event_bookings add column checked_in_at timestamptz;
alter table event_bookings add column checked_in_by uuid references staff_profiles(id);

alter table offer_redemptions add column ticket_number text unique;
alter table offer_redemptions add column verification_code text;
alter table offer_redemptions add column verified_at timestamptz;
alter table offer_redemptions add column verified_by uuid references staff_profiles(id);

-- Short, human-typeable codes — door staff read these off a phone screen
-- and type them in, so they need to be short, not cryptographically long.
-- Collision risk is negligible at resort scale and ticket_number is unique
-- anyway, so a code collision alone can't let someone else's ticket verify.
create or replace function generate_ticket_code() returns text as $$
  select upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
$$ language sql volatile;

create or replace function set_event_ticket_fields() returns trigger as $$
begin
  if new.ticket_number is null then
    new.ticket_number := 'BP-EVT-' || upper(substr(new.id::text, 1, 8));
  end if;
  if new.verification_code is null then
    new.verification_code := generate_ticket_code();
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_set_event_ticket_fields
  before insert on event_bookings
  for each row
  execute function set_event_ticket_fields();

create or replace function set_offer_ticket_fields() returns trigger as $$
begin
  if new.ticket_number is null then
    new.ticket_number := 'BP-OFR-' || upper(substr(new.id::text, 1, 8));
  end if;
  if new.verification_code is null then
    new.verification_code := generate_ticket_code();
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_set_offer_ticket_fields
  before insert on offer_redemptions
  for each row
  execute function set_offer_ticket_fields();
