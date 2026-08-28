# Application Tracker

Track job applications without typing them in. Screenshot a job listing, upload it, and Gemini pulls out the company, role, deadline, pay, and location so you can save it to a dashboard in a couple of clicks. A daily cron emails you when a deadline is less than a week away.

## How it works

1. **Upload** — On `/upload` you pick a screenshot of a job posting. (Or skip straight to step 3 and type the details in by hand.)
2. **Extract** — The image is POSTed to `/api/extract`, which sends it to Gemini 2.5 Flash with a prompt asking for a strict JSON object (`company`, `title`, `deadline`, `pay`, `location`, `url`, `job_type`).
3. **Confirm** — Every extracted field renders as an editable input, so you fix whatever the model got wrong before committing it.
4. **Save** — The row lands in the Supabase `jobs` table with status `applied`.
5. **Track** — `/dashboard` lists your applications with counts per status, and flags any deadline within 3 days in red. Status is a dropdown on each card: `applied → interview → offer → rejected`.
6. **Remind** — A Vercel cron hits `/api/reminders` daily at 13:00 UTC. For each user who has reminders on, it finds their non-rejected jobs falling inside their chosen lead time that haven't been mailed yet, sends one digest via Resend in their language, and marks them `reminder_sent`.

## Stack

| Piece | What it does |
|---|---|
| Next.js 16 (App Router) | Pages and API routes, deployed on Vercel |
| Supabase | Postgres for jobs, plus auth (email/password and Google OAuth) |
| Google Gemini 2.5 Flash | Vision extraction of job details from screenshots |
| Resend | Deadline reminder emails |
| Vercel Cron | Triggers the daily reminder job |

Styling is inline `style={{}}` objects — no CSS framework.

## Languages

The UI ships in English and Spanish. There's no i18n library: `lib/i18n.ts` holds both dictionaries and `lib/language.tsx` exposes them through a context provider as `t('some.key')`. The Spanish dictionary is typed as `Record<TranslationKey, string>`, so a key added to English that's missing from Spanish fails the build rather than silently falling back.

A user's choice is saved to `user_settings.language` and mirrored into `localStorage` — the stored copy is what the signed-out pages read, and the account's value wins once they sign in. Reminder emails are rendered in the same language. Adding a third language means adding a code to `LANGUAGES` and a dictionary; the compiler will list what's missing.

## Routes

| Route | Purpose |
|---|---|
| `/` | Redirects to `/dashboard` |
| `/dashboard` | Application list, status counts, deadline warnings |
| `/upload` | Screenshot upload and extraction, or manual entry; confirm-and-save |
| `/settings` | Gemini key, reminder preferences, default status, language, account |
| `/login` | Email/password sign in and sign up, plus Google OAuth |
| `/forgot-password` | Sends a Supabase reset email |
| `/reset-password` | Sets a new password from the emailed link |
| `POST /api/extract` | Screenshot → Gemini → JSON job fields |
| `GET /api/reminders` | Cron target; sends the deadline digest. Requires the `CRON_SECRET` bearer token |

## Database

Two tables in Supabase.

**jobs**

| Column | Notes |
|---|---|
| `id` | uuid, primary key |
| `user_id` | uuid, owner — the dashboard filters on this |
| `company, title, location, pay, url, job_type` | text, extracted from the screenshot |
| `deadline` | date, `YYYY-MM-DD` |
| `status` | one of `applied`, `interview`, `offer`, `rejected` |
| `notes` | text, optional; shown at the bottom of a card |
| `reminder_sent` | boolean, so a job is only mailed about once |
| `created_at` | timestamp, dashboard sorts by this descending |

**user_settings** — one row per user, keyed by a unique `user_id`.

| Column | Notes |
|---|---|
| `gemini_api_key` | That user's own key; extraction is disabled without one |
| `reminders_enabled` | Whether to send deadline emails at all |
| `reminder_days` | Lead time in days, 1–30 |
| `default_status` | Status a newly added application starts in |
| `language` | `en` or `es`; applies to the app and reminder emails |

Row-level security is on for both tables, scoped to `auth.uid() = user_id`. The reminder cron deliberately uses the service-role key so it can read across users.

Migrations live in `supabase/migrations/` and there's no runner wired up — paste each into the Supabase SQL editor and run it once, in order.

## Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=          # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # public anon key, used by the browser client
SUPABASE_SERVICE_ROLE_KEY=         # server-only, used by the reminders cron
RESEND_API_KEY=                    # https://resend.com
REMINDER_EMAIL=                    # optional fallback for jobs with no owner
NEXT_PUBLIC_APP_URL=               # e.g. https://your-app.vercel.app, for email links
CRON_SECRET=                       # long random string; gates /api/reminders
```

`CRON_SECRET` is required — `/api/reminders` refuses to run without it, since the route would otherwise be a public URL anyone could use to fire everyone's reminder emails. Vercel sends it automatically as a bearer token on scheduled invocations once it's set on the project. Generate one with `openssl rand -hex 32`.

There's deliberately no `GEMINI_API_KEY` here. Extractions bill to whichever key makes them, so each user supplies their own on `/settings` and spends their own free-tier quota. A user without a key can still add applications by typing them in.

`REMINDER_EMAIL` is only a fallback for legacy rows with no owner; normally reminders go to the email on each user's Supabase account.

## Running locally

```
npm install
# create .env.local and fill in the variables listed above
npm run dev
```

Run the SQL in `supabase/migrations/` against your Supabase project first, or the dashboard will come up empty.

Open `http://localhost:3000`. You'll be redirected to `/login` on first visit.

For Google OAuth to work locally, add `http://localhost:3000` as a redirect URL in your Supabase project's auth settings.

## Deploying

Push to `main` and Vercel builds it. Set every variable above in the Vercel project settings — the reminder cron and the extraction route both fail closed without theirs.

The cron schedule lives in `vercel.json`. Cron jobs only run on production deployments, not previews.

## Road Map

- No pagination on the dashboard. Every job is fetched in one query, which is fine at a few hundred rows and not beyond.
- Extraction trusts the model's JSON. If Gemini returns something unparseable the request fails with a generic 500 rather than a useful message.
