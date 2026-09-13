# Nong’s Art Den

A Next.js website and studio administration app for Nong’s art business in Aiken, South Carolina.

## Local development

```sh
npm install
cp .env.example .env.local
npm run dev
```

Open http://127.0.0.1:3000 and http://127.0.0.1:3000/admin.

`LOCAL_ADMIN_PREVIEW=true` opens the admin without a password **only during local development**. It is ignored in production and on Vercel. The development server binds to the local loopback address. Remove this setting to exercise the normal login screen.

Without cloud credentials, data persists in ignored `data/studio.json` and uploads in ignored `public/uploads/`. Local edits are shared between browser tabs and survive restarts. This fallback is intended for one local server process; it is disabled on Vercel. Local preview data does not automatically migrate to Neon.

## What works

- Public homepage, classes, class detail and reservation forms, custom offerings, wedding date inquiries, gallery with filters and enlarged images, and artist bio.
- Admin dashboard, calendar, programs, class sessions, capacity and pricing, registrations, inquiries, gallery uploads, custom offerings, and studio settings.
- A class can contain multiple dated sessions. One registration reserves the participant count for the entire class, including both sessions in a children’s week.
- Overlapping studio sessions and conflicts with full-day blocks are rejected. Wedding requests immediately hold the full day for review; declining releases it. Personal calendar notes remain private.
- Reserved and attended registrations consume places. Cancelling releases them; restoring a cancelled booking rechecks capacity.
- Public responses contain availability but no customer contact information or private calendar notes. Admin edits use a revision check to prevent overwriting another admin’s newer changes.
- Uploaded JPG, PNG, and WebP images are resized in the browser, validated on the server, and stored as WebP. The source samples in the parent `Images` folder remain untouched.

Sample programs, dates, capacities, and prices are **editable starting points**, not approved business details. Registration and inquiries start closed. Use **Studio settings** to open them after reviewing the content.

Payments, emails, SMS, reminders, and automatic confirmations are intentionally not integrated. Reservations and inquiries are saved and show an on-page reference. No online payment is collected. Wedding requests are holds for owner review, not finalized contracts.

## Vercel + Neon + Blob

1. Import this repository into Vercel. Set the **Root Directory** to `website`, framework to **Next.js**, and build command to `npm run build`.
2. Connect a **Neon Postgres** database through Vercel Marketplace. Set `DATABASE_URL` to its pooled connection string, including the provider’s SSL settings. Choose a region near your Vercel functions.
3. Create and connect a **public Vercel Blob** store for published artwork. The integration supplies `BLOB_READ_WRITE_TOKEN`. Create a second, **private Blob store** for customer reference photos and set its token as `REFERENCE_BLOB_READ_WRITE_TOKEN`. Never use the public artwork store for these photos.
4. Set `ADMIN_USERNAME`, a long unique `ADMIN_PASSWORD`, and a random `SESSION_SECRET` of at least 32 characters. For example, generate a secret locally with `openssl rand -hex 32`. Keep these server-only variables out of source control.
5. Deploy, sign in at `/admin/login`, replace the sample details, upload artwork, and review the public pages before opening registration.

The app automatically creates its `studio_state` table on the first database request. For this small studio, the data is a versioned JSONB document. Each mutation uses a PostgreSQL transaction and `SELECT ... FOR UPDATE`, so concurrent seat reservations and day holds are serialized across Vercel instances. This deliberately favors simple, consistent updates at low volume. Larger-volume reporting can later move the collections into normalized tables behind `lib/store.ts`.

Session cookies are signed, HttpOnly, SameSite=Lax, secure in production, and expire after eight hours. Mutating routes check the request origin; admin routes and image uploads require authentication. Sign-in attempts are rate-limited in persistent storage. Missing credentials keep production admin access closed. Neon and Blob must be connected and verified in the target Vercel environment before going live.

## Customer reference photos

Ornament and scribble request pages accept up to three optional reference photos. Customers can preview/remove photos before submitting. JPG, PNG, and WebP originals up to 30 MB are resized in the browser; the server validates and re-encodes them, removing metadata. Prepared uploads are limited to 800 KB each, with the complete request below Vercel’s body limit.

Reference photos are attached to the inquiry and displayed in **Admin → Inquiries**. Their image endpoint requires admin authentication and sends private, no-store responses. Local photos are saved under `data/references/`, outside the public directory. Production requires a separate private Blob store using `REFERENCE_BLOB_READ_WRITE_TOKEN`. The public gallery never receives customer reference photos. Photo submissions are limited to ten per IP per hour. Files are uploaded only when the inquiry is submitted; normal failed/duplicate requests clean up unused files. There is no customer upload link for an existing inquiry yet.

## Checks

```sh
npm run test
npm run lint
npm run typecheck
npm run build
node scripts/verify-production.mjs
```

The tests cover seat capacity, duplicate submissions, paired weekly sessions, wedding date conflicts and release, hidden programs, invalid dates, and privacy boundaries. The build uses Webpack because the local sandbox can prevent Turbopack’s CSS worker from binding a port.

The production smoke check runs the built app with isolated temporary data and credentials. It verifies production authentication, secure cookies, protected uploads, request origins, concurrent reservations, wedding conflicts, and public/admin routes. It does not contact Neon or Blob and removes its temporary data when finished.

## Structure

- `app/(public)` — public website routes
- `app/admin` — protected studio routes and login
- `app/api` — public booking endpoints and protected admin/upload endpoints
- `components/studio` — public and admin UI
- `lib/model.ts` — types, validation, and Aiken date/time formatting
- `lib/domain.ts` — booking, availability, and admin rules
- `lib/store.ts` — Neon transactions and local development persistence
- `lib/seed.ts` — editable initial content
- `public/art` — optimized copies of Nong’s supplied artwork

The local `.openai/hosting.json` file records the earlier unpublished Sites draft. It is excluded from Git and is not used by this Vercel app.
