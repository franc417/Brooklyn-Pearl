-- ============================================================================
-- Brooklyn Pearl Resort — Phase 2 Migration
-- Adds: BnB category, Swimming, Restaurant (reservations + menu), Events,
--       Offers, and per-service Loyalty tracking.
-- Additive to supabase/schema.sql (Phase 0) — run schema.sql first, then this.
-- ============================================================================

-- ============================================================================
-- GUESTS — cut over to real Supabase Auth accounts (same pattern as
-- staff_profiles). Safe to do now: no production data exists yet. Loyalty
-- tracking below requires a real, persistent guest identity — the old
-- password_hash-based approach was never wired to anything and guest
-- checkout (no account) is still fully supported everywhere; only the
-- OPTIONAL account itself moves to Supabase Auth.
-- ============================================================================

alter table guests drop column if exists password_hash;
alter table guests alter column id drop default;
alter table guests add constraint guests_id_fkey foreign key (id) references auth.users(id) on delete cascade;

-- ============================================================================
-- ENUMS
-- ============================================================================

create type accommodation_category as enum ('hotel', 'bnb');
create type restaurant_table_status as enum ('available', 'maintenance', 'out_of_service');
create type menu_category as enum ('starter', 'main', 'dessert', 'drink');

-- ============================================================================
-- BnB — no new tables. Hotel and BnB share the exact booking engine from
-- Phase 0 (room_types / room_units / bookings); this column is the only
-- change needed to tell them apart in listings and filters.
-- ============================================================================

alter table room_types add column category accommodation_category not null default 'hotel';

-- ============================================================================
-- SWIMMING — slot + capacity based, not date-range like a room. A session
-- (e.g. "Saturday 2–4pm") has a fixed capacity; many bookings can share one
-- session up to that limit. The exclusion-constraint trick from Phase 0
-- doesn't apply here (that prevents *overlap*, this needs to prevent a
-- *sum* exceeding a limit) — so capacity is enforced with a trigger instead,
-- serialized with SELECT ... FOR UPDATE to stay race-safe under concurrent
-- bookings, same guarantee as Phase 0's constraint, different mechanism.
-- ============================================================================

create table swimming_sessions (
  id uuid primary key default gen_random_uuid(),
  session_date date not null,
  start_time time not null,
  end_time time not null,
  capacity int not null,
  price_kes numeric(10,2) not null,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  constraint check_session_times check (end_time > start_time)
);

create table swimming_bookings (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references swimming_sessions(id) on delete restrict,
  guest_id uuid references guests(id) on delete set null,
  guest_first_name text not null,
  guest_last_name text not null,
  guest_email text not null,
  guest_phone text,
  party_size int not null check (party_size > 0),
  status booking_status not null default 'pending_payment',
  total_amount numeric(10,2) not null,
  currency text not null default 'KES',
  created_at timestamptz not null default now()
);

create index idx_swimming_bookings_session on swimming_bookings (session_id);

create or replace function check_swimming_capacity() returns trigger as $$
declare
  session_capacity int;
  booked_total int;
begin
  select capacity into session_capacity from swimming_sessions where id = new.session_id for update;

  select coalesce(sum(party_size), 0) into booked_total
    from swimming_bookings
    where session_id = new.session_id
      and status in ('pending_payment', 'confirmed')
      and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000');

  if booked_total + new.party_size > session_capacity then
    raise exception 'Session capacity exceeded: % spots requested, % of % already booked',
      new.party_size, booked_total, session_capacity;
  end if;

  return new;
end;
$$ language plpgsql;

create trigger trg_check_swimming_capacity
  before insert or update on swimming_bookings
  for each row
  when (new.status in ('pending_payment', 'confirmed'))
  execute function check_swimming_capacity();

alter table swimming_bookings enable row level security;
create policy "Guests can view their own swimming bookings"
  on swimming_bookings for select
  using (auth.uid() = guest_id);

-- ============================================================================
-- RESTAURANT — reservations + browsable menu (online ordering deliberately
-- deferred, see roadmap Phase 1 decision). A table can only hold one
-- reservation per overlapping time window, which IS the same shape as
-- Phase 0's room-booking problem — so it reuses that exact exclusion
-- constraint technique rather than the capacity-trigger approach above.
-- ============================================================================

create table menu_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price_kes numeric(10,2) not null,
  category menu_category not null,
  image_url text,
  is_available boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table restaurant_tables (
  id uuid primary key default gen_random_uuid(),
  table_number text not null unique,
  seats int not null,
  status restaurant_table_status not null default 'available',
  created_at timestamptz not null default now()
);

create table restaurant_reservations (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references restaurant_tables(id) on delete restrict,
  guest_id uuid references guests(id) on delete set null,
  guest_first_name text not null,
  guest_last_name text not null,
  guest_email text not null,
  guest_phone text,
  party_size int not null check (party_size > 0),
  reservation_start timestamptz not null,
  reservation_end timestamptz not null,
  special_requests text,
  status booking_status not null default 'pending_payment',
  created_at timestamptz not null default now(),
  constraint check_reservation_times check (reservation_end > reservation_start)
);

alter table restaurant_reservations
  add constraint no_overlapping_reservations
  exclude using gist (
    table_id with =,
    tstzrange(reservation_start, reservation_end) with &&
  )
  where (status in ('pending_payment', 'confirmed'));

create index idx_restaurant_reservations_table on restaurant_reservations (table_id);

alter table restaurant_reservations enable row level security;
create policy "Guests can view their own restaurant reservations"
  on restaurant_reservations for select
  using (auth.uid() = guest_id);

-- ============================================================================
-- EVENTS — feeds three UI surfaces (dedicated page, checkout popup,
-- homepage ticker) off the same rows via is_featured / is_published, so
-- there's exactly one place event data lives, not three. Capacity is
-- optional (null = unlimited) and enforced the same sum-based way as
-- swimming when it's set.
-- ============================================================================

create table events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  event_date date not null,
  start_time time,
  end_time time,
  price_kes numeric(10,2), -- null = free event
  capacity int, -- null = unlimited
  image_url text,
  is_featured boolean not null default false, -- drives checkout popup + homepage ticker
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

create table event_bookings (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete restrict,
  guest_id uuid references guests(id) on delete set null,
  guest_first_name text not null,
  guest_last_name text not null,
  guest_email text not null,
  guest_phone text,
  quantity int not null default 1 check (quantity > 0),
  status booking_status not null default 'pending_payment',
  total_amount numeric(10,2) not null,
  currency text not null default 'KES',
  created_at timestamptz not null default now()
);

create index idx_event_bookings_event on event_bookings (event_id);

create or replace function check_event_capacity() returns trigger as $$
declare
  event_capacity int;
  booked_total int;
begin
  select capacity into event_capacity from events where id = new.event_id for update;

  if event_capacity is null then
    return new; -- unlimited capacity — nothing to check
  end if;

  select coalesce(sum(quantity), 0) into booked_total
    from event_bookings
    where event_id = new.event_id
      and status in ('pending_payment', 'confirmed')
      and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000');

  if booked_total + new.quantity > event_capacity then
    raise exception 'Event capacity exceeded: % tickets requested, % of % already booked',
      new.quantity, booked_total, event_capacity;
  end if;

  return new;
end;
$$ language plpgsql;

create trigger trg_check_event_capacity
  before insert or update on event_bookings
  for each row
  when (new.status in ('pending_payment', 'confirmed'))
  execute function check_event_capacity();

alter table event_bookings enable row level security;
create policy "Guests can view their own event bookings"
  on event_bookings for select
  using (auth.uid() = guest_id);

-- ============================================================================
-- OFFERS — the "group of 5, Saturdays, KES 1,000 → free soda" example is a
-- conditional RULE, not a flat discount, so qualifying_criteria is
-- structured jsonb rather than a plain discount column. This table is
-- storage only; Phase 5/6 application code is what actually evaluates the
-- rule and applies it at checkout. Expected shape of qualifying_criteria,
-- documented here so Phase 5 has a contract to build against:
--   { "min_party_size": 5, "days_of_week": ["saturday"],
--     "service_category": "restaurant" }
-- ============================================================================

create table offers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text not null,
  qualifying_criteria jsonb not null default '{}',
  price_kes numeric(10,2), -- what the guest pays to qualify, if anything
  reward_description text not null, -- e.g. "Free 2L soda of choice"
  starts_at date not null,
  expires_at date not null,
  is_active boolean not null default true,
  image_url text,
  created_at timestamptz not null default now(),
  constraint check_offer_dates check (expires_at > starts_at)
);

-- Audit trail of which booking an offer was applied to — cheap to add now,
-- avoids a later migration once Phase 5 needs somewhere to log redemptions.
create table offer_redemptions (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references offers(id) on delete cascade,
  applied_to_table text not null, -- 'bookings' | 'swimming_bookings' | 'restaurant_reservations' | 'event_bookings'
  applied_to_id uuid not null,
  guest_id uuid references guests(id) on delete set null,
  redeemed_at timestamptz not null default now()
);

alter table offer_redemptions enable row level security;
create policy "Guests can view their own offer redemptions"
  on offer_redemptions for select
  using (auth.uid() = guest_id);

-- ============================================================================
-- LOYALTY — per-service counters, per Phase 1 decision ("10 room stays →
-- free room stay", tracked separately from swimming/restaurant). Counting
-- happens automatically via triggers on each booking table's status
-- transition to 'confirmed' — a DB trigger rather than application code,
-- specifically so no future API route can forget to award loyalty credit.
-- paid_count only ever counts genuinely paid stays; free_rewards_granted
-- tracks how many free rewards have already been used, so eligibility is
-- (paid_count / 10) > free_rewards_granted — standard punch-card math that
-- keeps working correctly across repeated reward cycles.
-- ============================================================================

create table loyalty_counters (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references guests(id) on delete cascade,
  service_category text not null, -- 'hotel' | 'bnb' | 'swimming' | 'restaurant'
  paid_count int not null default 0,
  free_rewards_granted int not null default 0,
  updated_at timestamptz not null default now(),
  unique (guest_id, service_category)
);

alter table loyalty_counters enable row level security;
create policy "Guests can view their own loyalty counters"
  on loyalty_counters for select
  using (auth.uid() = guest_id);

-- Convenience function Phase 6 checkout logic can call directly rather than
-- re-deriving the eligibility math in application code every time.
create or replace function guest_has_free_reward(p_guest_id uuid, p_service_category text)
returns boolean as $$
  select coalesce(
    (select (paid_count / 10) > free_rewards_granted
     from loyalty_counters
     where guest_id = p_guest_id and service_category = p_service_category),
    false
  );
$$ language sql stable;

-- Hotel / BnB loyalty trigger (category comes from the room_type)
create or replace function increment_loyalty_hotel_bnb() returns trigger as $$
declare
  v_category text;
begin
  if new.guest_id is null then
    return new; -- loyalty only accrues to real accounts, per Phase 1 decision
  end if;

  select category::text into v_category from room_types where id = new.room_type_id;

  insert into loyalty_counters (guest_id, service_category, paid_count)
    values (new.guest_id, v_category, 1)
  on conflict (guest_id, service_category)
    do update set paid_count = loyalty_counters.paid_count + 1, updated_at = now();

  return new;
end;
$$ language plpgsql;

create trigger trg_loyalty_hotel_bnb
  after insert or update on bookings
  for each row
  when (new.status = 'confirmed')
  execute function increment_loyalty_hotel_bnb();

-- Swimming loyalty trigger
create or replace function increment_loyalty_swimming() returns trigger as $$
begin
  if new.guest_id is null then
    return new;
  end if;

  insert into loyalty_counters (guest_id, service_category, paid_count)
    values (new.guest_id, 'swimming', 1)
  on conflict (guest_id, service_category)
    do update set paid_count = loyalty_counters.paid_count + 1, updated_at = now();

  return new;
end;
$$ language plpgsql;

create trigger trg_loyalty_swimming
  after insert or update on swimming_bookings
  for each row
  when (new.status = 'confirmed')
  execute function increment_loyalty_swimming();

-- Restaurant loyalty trigger
create or replace function increment_loyalty_restaurant() returns trigger as $$
begin
  if new.guest_id is null then
    return new;
  end if;

  insert into loyalty_counters (guest_id, service_category, paid_count)
    values (new.guest_id, 'restaurant', 1)
  on conflict (guest_id, service_category)
    do update set paid_count = loyalty_counters.paid_count + 1, updated_at = now();

  return new;
end;
$$ language plpgsql;

create trigger trg_loyalty_restaurant
  after insert or update on restaurant_reservations
  for each row
  when (new.status = 'confirmed')
  execute function increment_loyalty_restaurant();
