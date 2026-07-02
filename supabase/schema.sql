-- ============================================================================
-- Brooklyn Pearl Resort — Database Schema
-- Target: PostgreSQL 15+ (Supabase)
-- ============================================================================

-- Needed for the double-booking exclusion constraint further down
create extension if not exists btree_gist;
create extension if not exists pgcrypto; -- for gen_random_uuid()

-- ============================================================================
-- ENUMS
-- ============================================================================

create type staff_role as enum ('admin', 'front_desk', 'content_editor');
create type booking_status as enum ('pending_payment', 'confirmed', 'cancelled', 'completed', 'no_show');
create type payment_provider as enum ('pesapal_card', 'mpesa', 'airtel_money', 'manual');
create type payment_status as enum ('pending', 'completed', 'failed', 'refunded');
create type enquiry_type as enum ('room_reservation', 'dining_reservation', 'event_wedding', 'general');
create type enquiry_status as enum ('new', 'in_progress', 'closed');
create type room_unit_status as enum ('available', 'maintenance', 'out_of_service');

-- ============================================================================
-- GUESTS  (public-facing users — booking an account is optional; guest checkout allowed)
-- ============================================================================

create table guests (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null unique,
  phone text,
  password_hash text, -- null if guest checked out without creating an account
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- STAFF  (admin dashboard logins)
-- Staff authenticate through Supabase Auth (auth.users) rather than a
-- hand-rolled password table — Supabase handles hashing, session tokens,
-- and password resets for us, which is both less code and more secure than
-- rolling our own. This table just attaches a role to an authenticated user.
-- Create staff accounts via the Supabase dashboard (Authentication → Users →
-- Invite user), then insert a matching row here with their role.
-- ============================================================================

create table staff_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role staff_role not null default 'front_desk',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table staff_profiles enable row level security;

create policy "Staff can view their own profile"
  on staff_profiles for select
  using (auth.uid() = id);

-- ============================================================================
-- ROOM TYPES  (Pearl Suite, Deluxe Room, Penthouse, etc. — matches homepage cards)
-- ============================================================================

create table room_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  base_price_kes numeric(10,2) not null,
  base_price_usd numeric(10,2),
  capacity int not null default 2,
  size_sqm int,
  amenities jsonb not null default '[]', -- e.g. ["King bed", "Rooftop view", "Rain shower"]
  cover_image_url text,
  is_published boolean not null default true, -- staff can hide a room type without deleting it
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- ROOM UNITS  (actual physical rooms — this is what makes availability real,
-- not just a count. e.g. room_type "Deluxe Room" might have units 201, 202, 203)
-- ============================================================================

create table room_units (
  id uuid primary key default gen_random_uuid(),
  room_type_id uuid not null references room_types(id) on delete restrict,
  unit_number text not null,
  floor text,
  status room_unit_status not null default 'available',
  created_at timestamptz not null default now(),
  unique (room_type_id, unit_number)
);

-- ============================================================================
-- BOOKINGS
-- ============================================================================

create table bookings (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid references guests(id) on delete set null,
  -- snapshot guest contact info directly on the booking too, so a booking
  -- record is still meaningful even if the guest account is later deleted
  guest_first_name text not null,
  guest_last_name text not null,
  guest_email text not null,
  guest_phone text,

  room_type_id uuid not null references room_types(id) on delete restrict,
  room_unit_id uuid references room_units(id) on delete set null, -- assigned at/near check-in

  check_in date not null,
  check_out date not null,
  guests_count int not null default 1,
  special_requests text,

  status booking_status not null default 'pending_payment',
  total_amount numeric(10,2) not null,
  currency text not null default 'KES',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint check_dates check (check_out > check_in)
);

-- Prevent the same physical room from ever being double-booked for
-- overlapping date ranges — enforced by Postgres itself, not application code.
-- Only applies once a specific room_unit is assigned.
alter table bookings
  add constraint no_overlapping_bookings
  exclude using gist (
    room_unit_id with =,
    daterange(check_in, check_out) with &&
  )
  where (room_unit_id is not null and status in ('pending_payment', 'confirmed'));

create index idx_bookings_room_type on bookings (room_type_id);
create index idx_bookings_dates on bookings (check_in, check_out);
create index idx_bookings_guest_email on bookings (guest_email);

-- ============================================================================
-- PAYMENTS
-- ============================================================================

create table payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  provider payment_provider not null,
  provider_reference text, -- Pesapal tracking ID / M-Pesa receipt number
  amount numeric(10,2) not null,
  currency text not null default 'KES',
  status payment_status not null default 'pending',
  raw_response jsonb, -- store the full provider callback for audit/debugging
  created_at timestamptz not null default now()
);

create index idx_payments_booking on payments (booking_id);

-- ============================================================================
-- ENQUIRIES  (contact form submissions)
-- ============================================================================

create table enquiries (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null,
  enquiry_type enquiry_type not null default 'general',
  message text not null,
  status enquiry_status not null default 'new',
  handled_by uuid references staff_profiles(id),
  created_at timestamptz not null default now()
);

-- ============================================================================
-- TESTIMONIALS  (staff-moderated before they appear on the site)
-- ============================================================================

create table testimonials (
  id uuid primary key default gen_random_uuid(),
  guest_name text not null,
  location text,
  quote text not null,
  rating int check (rating between 1 and 5),
  approved boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- GALLERY MEDIA
-- ============================================================================

create table gallery_media (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  category text, -- 'rooms', 'dining', 'events', 'exterior', etc.
  alt_text text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- AUDIT LOG  (who changed what — important once staff are editing prices/availability)
-- ============================================================================

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  staff_user_id uuid references staff_profiles(id),
  action text not null, -- e.g. 'booking.cancelled', 'room_type.price_updated'
  entity text not null, -- table name
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- ROW LEVEL SECURITY (Supabase)
-- Guests can only ever see their own bookings. Staff access is granted
-- through the service role from API routes, not from the browser directly.
-- ============================================================================

alter table bookings enable row level security;
alter table guests enable row level security;
alter table payments enable row level security;

create policy "Guests can view their own bookings"
  on bookings for select
  using (auth.uid()::text = guest_id::text);

create policy "Guests can view their own profile"
  on guests for select
  using (auth.uid()::text = id::text);

-- No insert/update/delete policies for guests on bookings or payments —
-- those always go through server-side API routes using the service role key,
-- which bypasses RLS. This means a booking's price and status can never be
-- edited directly from the browser.

-- room_types, gallery_media, and approved testimonials are public read data —
-- no RLS needed, but writes should only ever happen via authenticated staff
-- API routes.
