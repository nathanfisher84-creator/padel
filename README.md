# PadelPro Coaching 🎾

A marketplace connecting padel players with professional coaches for **video-based
coaching**. Players upload match or training videos and receive personal written
feedback from the coach of their choice.

Built as a responsive web app (works great on mobile) with a JSON API that can
also power a future native mobile app.

## How the business works

- **Coaches join free** and create a public profile with their bio, experience
  and — crucially — **their own rates**:
  - a **one-off price** for a single video review
  - a **monthly subscription price** (includes up to N video reviews per month,
    also set by the coach)
- **Players** browse coaches, then pay either a one-off fee or subscribe monthly
  to the coach they choose.
- **Every payment is split automatically** between the platform owner and the
  coach. The platform's cut is configurable via `PLATFORM_FEE_PERCENT`
  (default **20%** — the coach keeps 80%). Every payment row in the database
  stores the exact split, giving you a full earnings ledger per coach and for
  the platform.

## Features

| Role | What they can do |
| --- | --- |
| **Player** | Register free · browse coaches · buy a one-off review or monthly plan · upload videos (MP4/MOV/WEBM/AVI, up to 500 MB) · receive written feedback |
| **Coach** | Register free · manage public profile & pricing · review queue of submitted videos · watch videos & send feedback · see earnings (after platform fee) and active subscriber count |
| **Admin (owner)** | Platform dashboard: gross revenue, platform earnings, coach payouts, user/submission counts, full payment ledger |

## Tech stack

- [Next.js 14](https://nextjs.org) (App Router) + TypeScript + Tailwind CSS
- [Prisma](https://prisma.io) ORM — SQLite in development, switch to PostgreSQL
  for production by changing the datasource provider
- JWT session cookies (`jose`) + bcrypt password hashing
- [Stripe](https://stripe.com) Checkout for one-off payments **and** monthly
  subscriptions, fulfilled via webhook — with a built-in **demo mode** when no
  Stripe keys are configured, so the entire flow works locally without a Stripe
  account
- Video files stored on local disk (`UPLOAD_DIR`), streamed through an
  authorised API route — only the player, their coach and admins can watch

## Getting started

```bash
npm install
cp .env.example .env        # then edit AUTH_SECRET etc.
npm run setup               # creates the SQLite DB and seeds demo data
npm run dev                 # http://localhost:3000
```

### Demo accounts (password: `password123`)

| Account | Email |
| --- | --- |
| Player | `player@padelpro.local` |
| Coach (Madrid) | `carlos@padelpro.local` |
| Coach (Stockholm) | `sofia@padelpro.local` |
| Coach (Buenos Aires) | `diego@padelpro.local` |
| Admin / owner | `admin@padelpro.local` |

Without Stripe keys the app runs in **demo payment mode**: clicking
“Buy one video review” or “Subscribe monthly” completes instantly so you can
try the full player → upload → coach feedback loop.

## Environment variables

See [`.env.example`](.env.example) for the full list:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Prisma connection string (SQLite file by default) |
| `AUTH_SECRET` | Secret for signing session cookies |
| `APP_URL` | Public URL, used in Stripe redirect URLs |
| `PLATFORM_FEE_PERCENT` | Owner's cut of every payment (default 20) |
| `STRIPE_SECRET_KEY` | Enables real Stripe Checkout (optional) |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for `/api/stripe/webhook` |
| `UPLOAD_DIR` | Where uploaded videos are stored (default `./uploads`) |
| `GEMINI_API_KEY` | Enables AI-standardized coach profile photos (optional) |

## Deploying to Vercel

The repo is Vercel-ready. Because Vercel is serverless (no persistent disk,
~4.5 MB request-body limit), the app automatically switches storage backends
there: Postgres instead of SQLite, and Vercel Blob with direct browser uploads
instead of local disk.

1. Push this repo to GitHub (already done) and sign in at
   [vercel.com](https://vercel.com) with your GitHub account.
2. **Add New → Project**, import the `padel` repository. Vercel detects
   Next.js and uses the `vercel-build` script automatically (it generates the
   Prisma client from `prisma/schema.postgres.prisma`, creates the tables, and
   seeds the demo accounts on every deploy).
3. Before the first deploy, open the project's **Storage** tab and create:
   - a **Postgres database** (Neon, free tier) — this sets `DATABASE_URL`;
   - a **Blob store** (free tier) — this sets `BLOB_READ_WRITE_TOKEN`.
4. In **Settings → Environment Variables**, add `AUTH_SECRET`
   (any long random string, e.g. from `openssl rand -base64 32`) and
   optionally `PLATFORM_FEE_PERCENT`.
5. Deploy. You'll get a public `https://<project>.vercel.app` URL with the
   demo accounts ready to log in.

Notes for the Vercel setup: uploaded videos are stored in Vercel Blob at
unguessable URLs; the app checks authorisation and then redirects the player
or coach to the file. For Stripe, set `APP_URL` to your Vercel URL so the
Checkout redirects land in the right place.

### Checking a deployment

`GET /api/health` reports database connectivity, the active video-storage
backend (`vercel-blob` or `local-disk`), payment mode (`stripe` or `demo`)
and the configured platform fee — a one-request smoke test after any deploy.

## Go-live checklist

Everything below the fold is done in code; these four steps are dashboard
actions for the owner:

1. **Set `AUTH_SECRET`** (critical): Vercel → padel → Settings →
   Environment Variables → add `AUTH_SECRET` = output of
   `openssl rand -base64 32`, all environments, then redeploy.
   `GET /api/health` reports `authSecretSet` — it must be `true`.
2. **Enable Stripe** (real payments): create a Stripe account, set
   `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` (see below), and set
   `APP_URL` to the public URL so checkout redirects land correctly.
3. **Custom domain**: Vercel → padel → Settings → Domains. Update
   `APP_URL` to match (it also drives the sitemap and social cards).
4. **Approve coaches**: new coach signups appear in the admin dashboard's
   "Coach approvals" queue and are invisible until approved.

## Enabling real payments

1. Create a [Stripe](https://dashboard.stripe.com) account and set
   `STRIPE_SECRET_KEY` in `.env`.
2. Add a webhook endpoint in the Stripe dashboard pointing at
   `https://your-domain/api/stripe/webhook`, subscribed to
   `checkout.session.completed` and `invoice.payment_succeeded`, and set
   `STRIPE_WEBHOOK_SECRET`.
3. Payments now go through Stripe Checkout; monthly renewals are recorded
   automatically with the same platform/coach revenue split.

> **Paying coaches out:** the app keeps an exact per-coach earnings ledger
> (`Payment.coachCents`). For automated payouts, the natural next step is
> [Stripe Connect](https://stripe.com/connect) — onboard each coach as a
> connected account and pay their share out on a schedule. Until then, coach
> balances are visible in the coach dashboard and admin ledger for manual
> payouts.

## Standardized coach photos (AI)

Coaches take a selfie or upload a photo when setting up their profile. If
`GEMINI_API_KEY` is set, the app offers an **AI-standardized studio version**
of that photo — the coach's real face on a consistent court-green studio
backdrop, square-cropped — so every coach picture on the marketplace shares one
polished format. The coach sees a before/after and can accept the studio
version or keep their original; if the key isn't set (or generation fails),
their original photo is simply used, so the flow never blocks.

- Get a key at [Google AI Studio](https://aistudio.google.com/apikey) and add
  `GEMINI_API_KEY` in Vercel → Settings → Environment Variables.
- The image model is `gemini-2.5-flash-image` ("Nano Banana"); override with
  `GEMINI_IMAGE_MODEL` if it is renamed.
- `GET /api/health` reports `photoStandardization` (`gemini` or `off`).
- Each generation is a single image-model call (a few cents); photos are
  downscaled to 800px in the browser before they are sent.

## Project structure

```
prisma/schema.prisma        Data model (users, profiles, payments, subscriptions,
                            submissions, feedback)
prisma/seed.ts              Demo data
src/lib/                    Auth, entitlements, revenue split, Stripe helpers
src/app/api/                JSON API (auth, checkout, webhook, videos, feedback)
src/app/                    Pages: landing, coach browsing, dashboards, submissions
src/components/             Client components (forms, purchase panel, nav)
```

## API overview (for a future mobile app)

| Endpoint | Description |
| --- | --- |
| `POST /api/auth/register` | Create player or coach account |
| `POST /api/auth/login` / `logout` | Session management (cookie-based) |
| `POST /api/checkout` | Start one-off or monthly purchase for a coach |
| `POST /api/stripe/webhook` | Stripe fulfilment |
| `PUT /api/coach/profile` | Update coach profile & rates |
| `POST /api/videos` | Upload a video (multipart) — requires credit/subscription |
| `GET /api/videos/:id/stream` | Stream a video (authorised parties only) |
| `POST /api/videos/:id/feedback` | Coach posts feedback |
