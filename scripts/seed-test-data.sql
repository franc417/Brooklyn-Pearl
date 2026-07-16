-- ============================================================================
-- Brooklyn Pearl Resort — Sample Seed Data
-- Run this in Supabase SQL Editor AFTER all migrations (002-009) have been
-- applied. This is clearly-fake placeholder content for testing the booking
-- flows end-to-end — replace with real business data before launch.
-- ============================================================================

-- ── Hotel + BnB room types ───────────────────────────────────────────────
-- Names match the hardcoded homepage cards exactly, so the interactive
-- booking bar's live results line up with what guests see on the page.
insert into room_types (id, name, slug, description, base_price_kes, base_price_usd, capacity, category, is_published) values
  ('a0000000-0000-0000-0000-000000000001', 'Pearl Suite', 'pearl-suite', 'Our signature suite with a private terrace.', 32000, 320, 2, 'hotel', true),
  ('a0000000-0000-0000-0000-000000000002', 'Deluxe Room', 'deluxe-room', 'Comfortable and modern, ideal for short stays.', 18500, 185, 2, 'hotel', true),
  ('a0000000-0000-0000-0000-000000000003', 'Penthouse', 'penthouse', 'Top-floor luxury with panoramic views.', 58000, 580, 4, 'hotel', true),
  ('a0000000-0000-0000-0000-000000000004', 'Garden Cottage', 'garden-cottage', 'A self-contained BnB unit with a private garden.', 14000, 140, 3, 'bnb', true)
on conflict (id) do nothing;

insert into room_units (room_type_id, unit_number) values
  ('a0000000-0000-0000-0000-000000000001', 'PS-01'),
  ('a0000000-0000-0000-0000-000000000001', 'PS-02'),
  ('a0000000-0000-0000-0000-000000000002', 'DR-101'),
  ('a0000000-0000-0000-0000-000000000002', 'DR-102'),
  ('a0000000-0000-0000-0000-000000000002', 'DR-103'),
  ('a0000000-0000-0000-0000-000000000003', 'PH-01'),
  ('a0000000-0000-0000-0000-000000000004', 'GC-01'),
  ('a0000000-0000-0000-0000-000000000004', 'GC-02')
on conflict do nothing;

-- ── Swimming ──────────────────────────────────────────────────────────────
insert into swimming_sessions (session_date, start_time, end_time, capacity, price_kes) values
  ('2026-08-15', '10:00', '12:00', 20, 500),
  ('2026-08-15', '14:00', '16:00', 20, 500),
  ('2026-08-16', '10:00', '12:00', 15, 500);

-- ── Restaurant ────────────────────────────────────────────────────────────
insert into restaurant_tables (table_number, seats) values
  ('T1', 2), ('T2', 2), ('T3', 4), ('T4', 4), ('T5', 8);

insert into menu_items (name, description, price_kes, category, is_available, sort_order) values
  ('Fresh Juice', 'Seasonal fruit, made to order', 350, 'drink', true, 1),
  ('Kenyan Coffee', 'Locally roasted', 300, 'drink', true, 2),
  ('Club Sandwich', 'Triple-decker with fries', 950, 'main', true, 1),
  ('Grilled Tilapia', 'Whole fish, ugali, sukuma wiki', 1400, 'main', true, 2),
  ('Chicken Curry', 'Coconut curry, basmati rice', 1200, 'main', true, 3),
  ('Chocolate Lava Cake', 'Warm, with vanilla ice cream', 650, 'dessert', true, 1),
  ('Samosas', 'Beef or vegetable, set of 4', 500, 'starter', true, 1);

-- ── Conference ────────────────────────────────────────────────────────────
insert into conference_rooms (name, capacity, hourly_rate_kes, amenities) values
  ('Summit Room', 20, 5000, '["Projector", "Whiteboard", "Video conferencing"]'),
  ('Boardroom', 10, 3500, '["TV screen", "Conference phone"]');

-- ── Events ────────────────────────────────────────────────────────────────
-- One featured (drives the homepage ticker + checkout popup), one not.
insert into events (name, slug, description, event_date, start_time, end_time, price_kes, capacity, is_featured, is_published) values
  ('Live Jazz Night', 'live-jazz-night', 'An evening of live jazz on the terrace.', '2026-08-20', '19:00', '22:00', 1500, 60, true, true),
  ('Sunday Family Brunch', 'sunday-family-brunch', 'A relaxed brunch buffet for the whole family.', '2026-08-24', '10:00', '13:00', 2000, 40, false, true);

-- ── Offers ────────────────────────────────────────────────────────────────
-- Matches the brief's own example: group of 5+, Saturdays, restaurant.
insert into offers (title, slug, description, qualifying_criteria, reward_description, starts_at, expires_at, is_active) values
  ('Saturday Group Special', 'saturday-group-special', 'For groups dining together on a Saturday.', '{"min_party_size": 5, "days_of_week": ["saturday"], "service_category": "restaurant"}', 'Free 2-litre soda of your choice', '2026-07-01', '2026-12-31', true);
