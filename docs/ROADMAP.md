# Brooklyn Pearl Resort — Full Platform Roadmap
### Hotel · BnB · Swimming · Restaurant · Events · Offers · Loyalty

This extends the platform already built (Phase 0) to cover the full scope in
the project summary. Phases are ordered by dependency, not calendar time —
each phase assumes the ones before it are done.

---

## Phase 0 — Foundation (COMPLETE, live at github.com/franc417/Brooklyn-Pearl)

- Next.js 16 + Supabase + Pesapal architecture, deployed and build-verified
- Hotel room booking: real availability, database-enforced no-double-booking
- Contact form → enquiries table + staff email notification
- Staff admin dashboard: bookings list, enquiries list, role-gated login
- Approved homepage design preserved exactly, wired to real endpoints

---

## Phase 1 — Decisions & Scope Lock

Four open questions in the project summary will cause rework if we guess
wrong. Flagging them now rather than after building:

1. **Design continuity.** The summary says "unique layout, inspired by a
   reference site we'll choose later" — but we already have an approved,
   brand-locked homepage. **Recommendation:** extend the existing design
   language to the new sections (BnB, Swimming, Restaurant, Events, Offers)
   rather than restart design exploration. Confirm before Phase 7.
2. **Restaurant scope.** "Restaurant services" could mean table reservations
   only, or full online food ordering (menu, cart, order status, possibly
   delivery). These are very different builds. **Recommendation:** ship
   reservations + a browsable menu first (Phase 3c); treat online ordering
   as a later, separate phase if wanted — it adds kitchen-ops concerns
   (item availability, order states) beyond a booking site.
3. **Loyalty tracking mechanism.** "10 purchases → 11th free" requires
   knowing *who* the guest is across visits. **Recommendation:** this only
   works reliably with real guest accounts (email+password via Supabase
   Auth) — tracking by email/phone alone on guest checkout is gameable.
   Guest checkout can stay for one-off bookings; loyalty credit only
   accrues to logged-in accounts. Also needs: does "10 purchases" mean
   any service, or per-service (10 room stays specifically)?
4. **Chance-based payment offers** ("pay more for a chance at free X") —
   legal review needed before this is built at all, given Kenyan gaming
   regulation. Sequenced last (Phase 9), behind a feature flag, not part
   of MVP.

---

## Phase 2 — Data Model Expansion

Builds on `supabase/schema.sql`, doesn't replace it.

- `room_types.category` (`hotel` | `bnb`) — hotel and BnB share the existing
  booking engine instead of duplicating it
- `swimming_sessions` (date, time slot, capacity) + `swimming_bookings`
  — slot-based, not date-range like rooms
- `menu_items` (display) → `restaurant_tables` + `restaurant_reservations`
  (time-slot based, same pattern as swimming)
- `events` + `event_bookings` (ticket purchases, reuses booking/payment
  pattern)
- `offers` (title, description, qualifying criteria, price, duration,
  expiry, is_active) — see Phase 5 note on why this needs a small rules
  engine, not just a discount field
- `loyalty_counters` (per guest account, per service category)
- `guests` extended to support real Supabase Auth accounts, not just the
  contact-snapshot fields currently on `bookings`

---

## Phase 3 — Core Booking Engines Per Service

Each sub-phase reuses the availability → create-booking → Pesapal-redirect →
IPN-confirm pattern already built and proven for hotel rooms:

- **3a. Hotel + BnB** — extend existing engine with the new `category` filter
- **3b. Swimming** — new slot/capacity engine (different shape from
  date-range rooms)
- **3c. Restaurant reservations** — table + time-slot booking, plus a
  browsable menu (ordering deferred per Phase 1 decision)

---

## Phase 4 — Events System (all three display modes from the summary)

- Events page: list + detail pages (image click → full detail → book/pay,
  per the summary's "click image → detail → purchase" requirement)
- Event ticket booking + payment, reusing the Phase 3 booking pattern
- **Payment popup**: a shared component shown during *any* checkout across
  every service, surfacing the current featured event
- **Homepage sliding announcement**: auto-rotating banner pulling active
  events, refreshes every few seconds

---

## Phase 5 — Offers System

- Offers page: list + detail, same image-click-to-detail pattern
- The example given ("group of 5, Saturdays, KES 1,000 → free soda") is a
  **conditional rule**, not a flat discount — qualification depends on
  party size, day of week, and service type. This needs a small rules
  engine (a handful of composable conditions), not just a discount field.
  Worth scoping the actual rule types needed before building this table.

---

## Phase 6 — Customer Records / Loyalty Engine

- Purchase counter per guest account (see Phase 1 decision on scope: global
  vs per-service)
- Checked automatically at checkout — on the 11th qualifying booking, the
  discount/free status applies before payment is charged, not after
- Needs an audit trail (already have `audit_log` from Phase 0 — extends
  naturally)

---

## Phase 7 — Site-Wide UX: Image-to-Detail Pattern & Navigation

- Homepage extended (not replaced) with: services overview, featured rooms,
  featured BnB, swimming section, restaurant section, current events,
  current offers, gallery, contact, footer — same visual system as the
  approved design
- Every image/card site-wide becomes clickable → dedicated detail page →
  book/pay CTA — one reusable template, applied across hotel, BnB,
  swimming, restaurant, events, and offers
- Navigation rebuilt: Home / Hotel / BnB / Swimming / Restaurant / Events /
  Offers / Gallery / Contact

---

## Phase 8 — Payments Expansion

- Extend the existing Pesapal integration to cover swimming, restaurant,
  event, and offer checkouts — same `payments` table, new line-item types
- Universal confirmation page + email receipts per service type, extending
  the confirmation flow already built for room bookings

---

## Phase 9 — Chance-Based Payment Offers (GATED — legal review required)

- Not started until Phase 1's legal question is resolved
- If cleared: needs transparent odds shown before payment, clear terms,
  and full audit logging — real money plus a game of chance needs a clean
  paper trail regardless of the regulatory outcome

---

## Phase 10 — QA & Security Pass

- End-to-end test of every booking type against Pesapal's sandbox
- Load-check availability endpoints now that multiple services hit Supabase
  concurrently
- Re-run the dependency/security check from Phase 0 against the larger
  codebase
- RLS policy review for every new table added in Phase 2

---

## Phase 11 — Staging → Production Launch

- Deploy to a Vercel staging environment for a full walkthrough
- Populate real content: rooms, BnB units, swimming sessions, menu, events,
  offers, gallery photography
- Domain + SSL cutover
- Go-live

---

## Phase 12 — Post-Launch

- Uptime/error monitoring
- Staff training on the now-multi-service admin dashboard
- Observe the first loyalty cycle in practice, adjust rules if the
  real-world behavior doesn't match what Phase 1 assumed

---

## At a glance

```
Phase 0  ✅ Foundation (live)
Phase 1  🔲 Decisions & scope lock          ← do this before Phase 2
Phase 2  🔲 Data model expansion
Phase 3  🔲 Booking engines (Hotel/BnB, Swimming, Restaurant)
Phase 4  🔲 Events (page + popup + ticker)
Phase 5  🔲 Offers (+ rules engine)
Phase 6  🔲 Loyalty / customer records
Phase 7  🔲 Site-wide UX + navigation
Phase 8  🔲 Payments expansion
Phase 9  🔲 Chance-based offers            ← GATED on legal review
Phase 10 🔲 QA & security pass
Phase 11 🔲 Staging → launch
Phase 12 🔲 Post-launch
```
