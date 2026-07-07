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

## Phases 1-7 — COMPLETE (commits 3221fc4 → e992e83)

Built in order, each tested against a real local Postgres instance and/or a
real `npm run build` before pushing, not just written and assumed correct:

- **Phase 1**: scope locked — reservations-only restaurant (no online
  ordering), per-service loyalty counters, Supabase not yet provisioned
- **Phase 2**: BnB category, Swimming, Restaurant, Events, Offers,
  per-service loyalty schema — all constraints proven with real inserts
  (capacity triggers, exclusion constraints, RLS under a non-superuser role)
- **Phase 3**: Swimming + Restaurant booking engines. Found and fixed along
  the way: `payments` had to become polymorphic (source_table/source_id) to
  support anything beyond hotel bookings — pulled forward from the
  originally-planned Phase 8, so Phase 8 below is now smaller than planned
- **Phase 4**: Events — list/detail pages, checkout popup, homepage ticker,
  paid events via Pesapal, free events confirm instantly
- **Phase 5**: Offers — eligibility banner + logged redemptions (not
  automatic payment discounts — the brief's example is a reward redeemed in
  person, not an online price change)
- **Phase 6**: Loyalty checkout integration + guest accounts. Found and
  fixed along the way: a free-reward booking would have double-counted
  toward the *next* reward without the `is_loyalty_reward` flag added here;
  also added a missing `INSERT` RLS policy on `guests` that would have
  silently blocked every signup
- **Phase 7 (partial)**: navigation links to all five new pages (mobile
  menu + footer, not desktop nav — see below), and a real layout bug found
  and fixed (the Events ticker was rendering underneath the fixed nav bar)

---

## What's left

### Phase 7, the rest of it — homepage visual integration
**What it is:** Featured section blocks for BnB, Swimming, Restaurant,
Events, and Offers on the homepage itself, styled to match the existing
rooms/dining sections — not just links to separate pages.
**Why it's separate from what's done:** This is a visual design task, the
same kind of work as the original three homepage concepts — it deserves an
iterative visual review, not a blind pass at the end of a long build.
**Two things need your eyes specifically:**
- The desktop nav was deliberately left untouched — adding 4 more items to
  the existing `.nav-links` flex row might overflow on real screens, and I
  have no way to render a browser here to check. Look at it live and tell
  me if it needs adjusting.
- The `.has-ticker nav { top: 38px }` fix is a reasoned estimate, not a
  visually confirmed one — check it lines up correctly once you can see it.

### Phase 8 — Payments expansion (now smaller than originally planned)
**What it is:** Originally "extend Pesapal to cover every service." Mostly
already done — Swimming and Events already use the polymorphic payments
system built in Phase 3; Restaurant deliberately never needs it.
**What's actually left:** A refund/cancellation flow. Right now there is no
way — anywhere, including the admin dashboard — to cancel a paid booking
and refund the guest. For a live business taking real payments, this is a
real gap, not a nice-to-have.
**Improvement:** Add a "Cancel & Refund" action to the admin bookings page
that calls Pesapal's refund endpoint and updates the booking status.

### Phase 9 — Chance-based payment offers (GATED — unchanged)
**What it is:** The "pay more for a chance at free X" mechanic from the
original brief. Still not started, still correctly gated on confirming this
doesn't need BCLB licensing before it's built.
**Improvement:** Start the legal question now, in parallel with Phases
10-11, rather than waiting — it's likely the slowest-moving piece, same
reasoning as starting Pesapal merchant verification early.

### Phase 10 — QA & security pass
**What it is:** End-to-end testing, load-checking, dependency audit, RLS
review.
**Adjustment:** Partially done incrementally already — every migration was
tested against real Postgres, and one real dependency vulnerability was
already caught and fixed (Phase 0). What's genuinely still untested: the
**actual Pesapal sandbox** — every test so far used placeholder credentials;
the real redirect-to-Pesapal-and-back flow has never run against a live
system. This is the single biggest untested risk in the project right now.
**Improvement:** Generate real TypeScript types from the Supabase schema
(`supabase gen types typescript`) — flagged back in Phase 3 as a gap; right
now a column-name typo in a query would not be caught by the build.

### Phase 11 — Staging → launch
**What it is:** Deploy to Vercel, populate real content, domain/SSL, go-live.
**Adjustment:** No structural change, but this now needs real data entered
for rooms, BnB units, swimming sessions, restaurant tables/menu, events, and
offers — currently all empty since Supabase isn't provisioned yet.
**Improvement:** A seed SQL script for initial content would make this much
faster than clicking through the Supabase dashboard row by row.

### Phase 12 — Post-launch
**What it is:** Monitoring, staff training, observing the first real
loyalty cycle.
**Improvement:** Add error tracking (e.g. Sentry) before launch, not after
— it's cheap now and far more useful if something breaks on day one.

### Cross-cutting gaps worth knowing about
- No password-reset flow for guests or staff (Supabase Auth supports it;
  no UI calls it yet)
- No automated test suite — everything has been verified through real,
  scripted manual testing each phase, not tests that re-run automatically
  on future changes

