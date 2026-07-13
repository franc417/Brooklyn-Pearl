-- ============================================================================
-- Brooklyn Pearl Resort — Conference Hall Migration
-- Structurally identical to restaurant_reservations (a room, a time window,
-- no double-booking) but conference hire has a real calculable cost —
-- hourly_rate_kes x hours — so unlike a restaurant table, this goes through
-- Pesapal/M-Pesa like Swimming does, not the instant-confirm-no-payment
-- path Restaurant uses.
-- ============================================================================

create table conference_rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  capacity int not null,
  hourly_rate_kes numeric(10,2) not null,
  amenities jsonb not null default '[]', -- e.g. ["Projector", "Whiteboard", "Video conferencing"]
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

create table conference_bookings (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references conference_rooms(id) on delete restrict,
  guest_id uuid references guests(id) on delete set null,
  guest_first_name text not null,
  guest_last_name text not null,
  guest_email text not null,
  guest_phone text,
  organization_name text,
  purpose text, -- e.g. "Quarterly board meeting"
  attendee_count int not null check (attendee_count > 0),
  booking_start timestamptz not null,
  booking_end timestamptz not null,
  status booking_status not null default 'pending_payment',
  total_amount numeric(10,2) not null,
  currency text not null default 'KES',
  created_at timestamptz not null default now(),
  constraint check_conference_times check (booking_end > booking_start)
);

-- Same double-booking protection technique as restaurant_reservations —
-- a room can't be booked for two overlapping time windows.
alter table conference_bookings
  add constraint no_overlapping_conference_bookings
  exclude using gist (
    room_id with =,
    tstzrange(booking_start, booking_end) with &&
  )
  where (status in ('pending_payment', 'confirmed'));

create index idx_conference_bookings_room on conference_bookings (room_id);

alter table conference_bookings enable row level security;
create policy "Guests can view their own conference bookings"
  on conference_bookings for select
  using (auth.uid() = guest_id);
