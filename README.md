# Vaitik Dental Care website

Website, online booking and staff admin for Vaitik Dental Care (Koraput and Semiliguda).

- **Stack:** Next.js 15 (App Router) on Netlify, Supabase (Postgres, Auth, Storage, row level security), Resend for booking emails, and Razorpay for an optional booking fee (off by default).
- **Pages:**
  - `/` is the website.
  - `/book` is the booking form on its own page.
  - `/privacy` is the privacy policy.
  - `/admin` is the staff panel.
- **Without Supabase configured,** the website still runs with the built-in content in `src/lib/content.js` (useful for local design work), but booking and admin are switched off.

## How it works

| Piece | Where |
| --- | --- |
| Database tables, security rules, booking function, dashboard views | `supabase/migrations/*.sql` |
| Starting data (branches, hours, treatments, settings) | `supabase/seed.sql` |
| Free-slot calculation (hours − holidays − bookings − past times) | `src/lib/slots.js` |
| `GET /api/slots`, `POST /api/bookings` | `src/app/api/` |
| `POST /api/payments/order`, `POST /api/payments/webhook` (Razorpay) | `src/app/api/payments/` |
| Admin screens, and server actions checked against the staff role | `src/components/admin/`, `src/app/admin/actions.js` |
| `/admin` login guard | `src/middleware.js` |
| Content that is not in the database (FAQs, social links, privacy contact) | `src/lib/content.js` |

**Bookings.** The browser never writes to the database directly. `POST /api/bookings`:
1. Limits each IP address to 5 booking attempts per 10 minutes.
2. Validates the form with zod: Indian 10-digit mobile, a date that isn't in the past and is at most 60 days ahead, consent ticked, and the hidden anti-spam field empty.
3. Checks that the slot is free.
4. Calls the `create_booking` database function, which re-checks the rules and creates the patient and appointment in one transaction.

A unique index on (branch, date, time) makes double-booking impossible even when two people submit at the same moment; the second person sees "That time was just taken".

**Security.**
- The public (anon) key can only read what the website shows.
- Staff can read and change clinic data. Only owners can change settings, branch details and staff, or delete patients.
- The service role key is used only on the server.

## Setup

### 1. Supabase
1. Create a project at [supabase.com](https://supabase.com). Choose the Mumbai region, since it's closest to Odisha.
2. Create the database. Pick one:
   - **SQL editor:** paste and run each file in `supabase/migrations/` in order, then `supabase/seed.sql`.
   - **CLI:** run `npx supabase link --project-ref YOUR-REF`, then `npx supabase db push`, then run `supabase/seed.sql` in the SQL editor.
3. Go to **Authentication → Sign In / Providers** and turn off **Allow new users to sign up**. Staff accounts are created from the admin panel.
4. Create the first owner:
   1. Go to **Authentication → Users → Add user**, enter an email and password, and tick *Auto confirm*.
   2. In the SQL editor, run:
      ```sql
      insert into public.staff (user_id, role, name, email)
      select id, 'owner', 'Dr Ch Kartik', email from auth.users where email = 'OWNER@EMAIL';
      ```
   After this, the owner adds everyone else in **Admin → Settings → Staff users**.
5. The migration also creates the `media` storage bucket for photos: public, WebP only, 500 KB maximum.

### 2. Environment variables
Copy `.env.example` to `.env.local` for local development. On Netlify, set the same variables under **Site configuration → Environment variables**.

| Variable | What it is |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page. **Secret**: server only |
| `RESEND_API_KEY`, `CLINIC_EMAIL`, `RESEND_FROM` | New-booking emails. Verify your domain in Resend and use an address on it in `RESEND_FROM` |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Only for the booking fee. Start with test keys |

### 3. Run locally
```bash
npm install
npm run dev          # http://localhost:3000, admin at /admin
```

### 4. Deploy on Netlify
1. **Add new site → Import from Git**, then pick this repository. Netlify detects Next.js; `netlify.toml` sets the build command and Node 22.
2. Add the environment variables above, then deploy.
3. Add your domain under **Domain management**; HTTPS is automatic.
4. Every push to `main` redeploys the site.

Admin changes (prices, reviews, gallery, hours) refresh the website pages straight away; a page can occasionally take up to a minute to update.

### 5. Booking fee (optional)
1. In the Razorpay dashboard, add a webhook pointing to `https://YOUR-DOMAIN/api/payments/webhook`. Select the events `payment.captured`, `order.paid` and `payment.failed`, and set a secret, which goes in `RAZORPAY_WEBHOOK_SECRET`.
2. In **Admin → Settings**, switch on the booking fee and set the amount.

The payment status is only ever changed by the webhook after checking Razorpay's signature; the browser is never trusted. Switch the fee off again and the form goes back to booking without payment.

### 6. Data retention
The privacy policy says booking data is kept for 12 months after a patient's last appointment. To enforce that automatically, run this once in the SQL editor (it needs the `pg_cron` extension, which Supabase provides):
```sql
create extension if not exists pg_cron;
select cron.schedule('purge-expired-patients', '30 20 * * *', $$select public.purge_expired_patients(12)$$);  -- 2:00 AM IST daily
```
Owners can also delete a patient straight away: **Admin → Patients → History → Delete this patient and their data**.

## Still to fill in
- Every `[SQUARE BRACKET]` value in `src/lib/content.js`: social links, Google review links, year established, payment and parking answers, privacy contact and grievance officer, refund policy.
- Everything else from the admin panel: the emergency number, prices, doctors' qualifications and registration numbers, reviews, and gallery photos.
- Photos: `public/images/og.jpg` (1200×630, for link previews), and `SITE.heroImage` in `content.js`.
- The "Last updated" date on the privacy page.

## Tests

```bash
npm test          # unit tests: slots, hours, open/closed badge, validation, Razorpay signatures, booking email
npm run test:db   # runs the migrations and seed on a throwaway local Postgres 16, then checks the booking rules and security
```

`npm run test:db` needs Postgres 16 installed locally (`initdb`, `pg_ctl`, `psql`). It covers double-booking, blocked dates, Semiliguda's Sunday hours, past dates, the rate limit, what the public key can and cannot see, receptionist vs owner limits, and data retention.

### Checklist before going live
Run these on the deployed site with Razorpay test keys.

| # | Test | Expected |
| --- | --- | --- |
| 1 | **Double-booking.** Open `/book` in two browsers and choose the same branch, date and time in both. Submit one, then the other. | The first gets a reference like `VDC-4F7K`. The second sees "That time was just taken. Please pick another." and that time is crossed out. |
| 2 | **Blocked date.** In Admin → Doctors and schedule, block a date for Koraput. Try to book Koraput on that date. | The form says the clinic is closed that day and shows no times. Semiliguda is still bookable unless *All branches* was ticked. |
| 3 | **Sunday at Semiliguda.** Pick Semiliguda and a Sunday. | Times run from 5:00 PM to 8:00 PM only. The branch card shows "Opens tomorrow 5:00 PM" on Saturday night. |
| 4 | **Admin role limits.** Sign in as a receptionist. | They can manage appointments, hours, treatments, doctors, reviews and gallery. In Settings, the fields are read-only and the Save and Add staff controls are hidden. Patients have no Delete option. Signing in with an account that isn't on the staff list shows "No staff access". |
| 5 | **Webhook with a bad signature.** Run `curl -X POST https://YOUR-DOMAIN/api/payments/webhook -H 'x-razorpay-signature: bad' -d '{"event":"payment.captured"}'` | `400 Invalid signature`, and no booking changes. |
| 6 | **Paid booking.** Turn the fee on and book with a Razorpay test card or UPI. | The admin list shows *Fee paid* once Razorpay calls the webhook. |
| 7 | **Rate limit.** Submit the form 6 times within 10 minutes from one network. | The 6th attempt says "Too many booking attempts". |
| 8 | **Email.** Make a booking. | `CLINIC_EMAIL` receives the branch, date, time and patient phone. |
