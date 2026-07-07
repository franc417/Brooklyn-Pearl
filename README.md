# Brooklyn Pearl Resort

Next.js + Supabase + Pesapal booking system. The homepage design is preserved
exactly as approved (`src/app/_homepage-content.html`, extracted byte-for-byte
from the original file) — everything below wires it up to a real backend.

## Stack

- **Frontend + API**: Next.js 16 (App Router), deployed on Vercel
- **Database / Auth / Storage**: Supabase (Postgres)
- **Payments**: Pesapal (card + M-Pesa + Airtel Money, one integration)
- **Email**: Resend

## 1. Local setup (Arch Linux)

```bash
# Node.js, if you don't already have it
sudo pacman -S nodejs npm

cd brooklyn-pearl-resort
npm install
cp .env.example .env.local
# now fill in .env.local with real values — see sections below
npm run dev
# → http://localhost:3000
```

## 2. Create a Supabase project

1. [supabase.com](https://supabase.com) → New Project (free tier is fine to start).
2. **Project Settings → API** → copy the `Project URL`, `anon public` key, and
   `service_role` key into `.env.local`.
3. **SQL Editor** → run `supabase/schema.sql` first, then
   `supabase/migrations/002_phase2.sql` — in that order. Each migration file
   is additive; run them in numeric order as new ones are added. Both have
   been tested end-to-end against a real Postgres instance (capacity limits,
   the double-booking exclusion constraints, and the loyalty counters were
   all verified with real inserts, not just checked for valid syntax) —
   see `docs/ROADMAP.md` for what each phase covers.
4. Add your room types (Pearl Suite, Deluxe Room, Penthouse) as rows in the
   `room_types` table, and at least one row per room in `room_units` for
   each — this is what makes real availability checking possible. Easiest
   done from **Table Editor** in the Supabase dashboard for now.
5. **Create your own staff login**: Authentication → Users → Add User (set an
   email + password). Copy the generated user's UUID, then in the SQL Editor:
   ```sql
   insert into staff_profiles (id, name, role)
   values ('paste-the-uuid-here', 'Your Name', 'admin');
   ```
   You can now sign in at `/admin/login`.
6. **Generate real TypeScript types** once the project is live — this
   couldn't be done in the build sandbox (it needs a container runtime and
   network access to `public.ecr.aws` that weren't available there), but
   works normally once you have real project credentials:
   ```bash
   npx supabase gen types typescript --project-id your-project-ref > src/types/database.ts
   ```
   Worth doing early — right now a typo'd column name in a query wouldn't
   be caught by the build.

## 3. Pesapal setup

1. Register at [pesapal.com](https://www.pesapal.com) for a merchant account
   (this involves business verification — start this early, it's the
   slowest step). Use the sandbox credentials from
   [developer.pesapal.com](https://developer.pesapal.com) to build and test
   before that's approved.
2. Copy your `consumer_key` / `consumer_secret` into `.env.local` as
   `PESAPAL_CONSUMER_KEY` / `PESAPAL_CONSUMER_SECRET`. Leave `PESAPAL_ENV=sandbox`
   until you're ready to go live.
3. **Register your IPN URL — one-time step.** Once deployed (or using a tool
   like `ngrok` for local testing, since Pesapal can't reach `localhost`),
   run:
   ```bash
   curl -X POST https://cybqa.pesapal.com/pesapalv3/api/URLSetup/RegisterIPN \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer $(curl -s -X POST https://cybqa.pesapal.com/pesapalv3/api/Auth/RequestToken \
       -H 'Content-Type: application/json' \
       -d '{"consumer_key":"YOUR_KEY","consumer_secret":"YOUR_SECRET"}' | jq -r .token)" \
     -d '{"url":"https://yourdomain.com/api/payments/pesapal/callback","ipn_notification_type":"GET"}'
   ```
   The response includes an `ipn_id` — copy it into `.env.local` as
   `PESAPAL_IPN_ID`. Swap the sandbox URL for the production one
   (`https://pay.pesapal.com/v3/api/...`) once you go live.

## 4. Resend (email)

1. [resend.com](https://resend.com) → API Keys → create one → `RESEND_API_KEY`.
2. Verify a sending domain (or use their test domain while developing) →
   `NOTIFICATION_EMAIL_FROM`.

## 5. Deploy to Vercel

```bash
npm i -g vercel
vercel login
vercel
```

Then in the Vercel project dashboard → Settings → Environment Variables, add
everything from `.env.local` (never commit `.env.local` itself — it's
gitignored). Set `NEXT_PUBLIC_SITE_URL` to your real domain once attached.

## 6. Push to GitHub as a private repo

```bash
cd brooklyn-pearl-resort
git init
git add .
git commit -m "Initial commit: Brooklyn Pearl Resort booking system"

# Create the empty private repo on GitHub first (via github.com/new, or gh CLI):
gh repo create brooklyn-pearl-resort --private --source=. --remote=origin
git push -u origin main
```

(If you don't have the `gh` CLI: `sudo pacman -S github-cli`, then `gh auth login`
once before the command above. Or just create the empty repo in the GitHub
web UI and run `git remote add origin git@github.com:yourname/brooklyn-pearl-resort.git`
instead of the `gh repo create` line.)

Once it's on GitHub, Codespaces is available any time — just click **Code →
Codespaces → Create codespace** on the repo page. Nothing further to set up
for that.

## What's real vs. what's next

**Working end-to-end**: booking availability check, booking creation with
database-enforced no-double-booking, Pesapal payment redirect, payment
confirmation via IPN webhook, confirmation emails, contact form → database +
staff email notification, staff login, admin dashboard (bookings list,
enquiries list with mark-handled).

**Phase 2** (deliberately deferred, see conversation): the rooms grid and
testimonials on the homepage are still the original static HTML. Once you've
entered real room data in Supabase, those sections should be pulled out of
`_homepage-content.html` and rendered from `/api/testimonials` and a new
`/api/room-types` the same way `booking.js` already talks to the live APIs —
this means staff can update prices/testimonials from the admin dashboard
without a code deploy. Ask me when you're ready for that pass.

## Project structure

```
supabase/schema.sql              — full DB schema, run once in Supabase SQL Editor
src/app/_homepage-content.html   — your approved design, preserved exactly
src/app/page.tsx                 — renders it, loads the interactive scripts
public/js/site-legacy.js         — original nav/scroll/reveal behavior, unchanged
public/js/booking.js             — new: wires booking bar + contact form to real APIs
src/app/api/                     — availability, bookings, Pesapal IPN, enquiries, testimonials
src/app/admin/                   — staff login + dashboard (bookings, enquiries)
src/proxy.ts                     — guards /admin at the network edge (Next.js 16's
                                    renamed "middleware" convention)
src/lib/supabase/                — browser client + server/service-role clients
src/lib/pesapal.ts               — Pesapal API v3 integration
src/lib/email.ts                 — Resend helpers
```
