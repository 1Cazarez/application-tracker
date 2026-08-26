# Application Tracker

Track job applications without typing them in. Screenshot a job listing, upload it, and Gemini pulls out the company, role, deadline, pay, and location so you can save it to a dashboard in a couple of clicks. A daily cron emails you when a deadline is less than a week away.

## How it works

1. **Upload** — On `/upload` you pick a screenshot of a job posting.
2. **Extract** — The image is POSTed to `/api/extract`, which sends it to Gemini 2.5 Flash with a prompt asking for a strict JSON object (company, title, deadline, pay, location, url, job_type).
3. **Confirm** — Every extracted field renders as an editable input, so you fix whatever the model got wrong before committing it.
4. **Save** — The row lands in the Supabase `jobs` table with status `applied`.
5. **Track** — `/dashboard` lists your applications with counts per status, and flags any deadline within 3 days in red. Status is a dropdown on each card: applied → interview → offer → rejected.
6. **Remind** — A Vercel cron hits `/api/reminders` daily at 13:00 UTC. It finds non-rejected jobs with a deadline in the next 7 days that haven't been mailed yet, sends one digest email via Resend, and marks them `reminder_sent`.

## Stack

| Piece | What it does |
| --- | --- |
| Next.js 16 (App Router) | Pages and API routes, deployed on Vercel |
| Supabase | Postgres for jobs, plus auth (email/password and Google OAuth) |
| Google Gemini 2.5 Flash | Vision extraction of job details from screenshots |
| Resend | Deadline reminder emails |
| Vercel Cron | Triggers the daily reminder job |

Styling is inline `style={{}}` objects — no CSS framework.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Redirects to `/dashboard` |
| `/dashboard` | Application list, status counts, deadline warnings |
| `/upload` | Screenshot upload, extraction, confirm-and-save |
| `/settings` | Stores a Gemini API key in `user_settings` |
| `/login` | Email/password sign in and sign up, plus Google OAuth |
| `/forgot-password` | Sends a Supabase reset email |
| `/reset-password` | Sets a new password from the emailed link |
| `POST /api/extract` | Screenshot → Gemini → JSON job fields |
| `GET /api/reminders` | Cron target; sends the deadline digest |

## Database

Two tables in Supabase.

**`jobs`**

| Column | Notes |
| --- | --- |
| `id` | uuid, primary key |
| `user_id` | uuid, owner — the dashboard filters on this |
| `company`, `title`, `location`, `pay`, `url`, `job_type` | text, extracted from the screenshot |
| `deadline` | date, `YYYY-MM-DD` |
| `status` | one of `applied`, `interview`, `offer`, `rejected` |
| `notes` | text, optional; shown at the bottom of a card |
| `reminder_sent` | boolean, so a job is only mailed about once |
| `created_at` | timestamp, dashboard sorts by this descending |

**`user_settings`** — `user_id` (unique) and that user's `gemini_api_key`.

Row-level security is on for both tables, scoped to `auth.uid() = user_id`. The reminder cron deliberately uses the service-role key so it can read across users.

The schema changes that add ownership live in [`supabase/migrations/0001_per_user_ownership.sql`](supabase/migrations/0001_per_user_ownership.sql). There's no migration runner wired up — paste it into the Supabase SQL editor and run it once.

## Environment variables

```bash
NEXT_PUBLIC_SUPABASE_URL=          # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # public anon key, used by the browser client
SUPABASE_SERVICE_ROLE_KEY=         # server-only, used by the reminders cron
GEMINI_API_KEY=                    # optional fallback when a user hasn't saved their own
RESEND_API_KEY=                    # https://resend.com
REMINDER_EMAIL=                    # optional fallback for jobs with no owner
NEXT_PUBLIC_APP_URL=               # e.g. https://your-app.vercel.app, for email links
```

`GEMINI_API_KEY` and `REMINDER_EMAIL` are both fallbacks. Normally each user saves their own Gemini key on `/settings`, and reminders go to the email on their Supabase account.

## Running locally

```bash
npm install
# create .env.local and fill in the variables listed above
npm run dev
```

Run the SQL in [`supabase/migrations/`](supabase/migrations/) against your Supabase project first, or the dashboard will come up empty.

Open [http://localhost:3000](http://localhost:3000). You'll be redirected to `/login` on first visit.

For Google OAuth to work locally, add `http://localhost:3000` as a redirect URL in your Supabase project's auth settings.

## Deploying

Push to `main` and Vercel builds it. Set every variable above in the Vercel project settings — the reminder cron and the extraction route both fail closed without theirs.

The cron schedule lives in [`vercel.json`](vercel.json). Cron jobs only run on production deployments, not previews.

## Known gaps

- **`/api/reminders` is unauthenticated.** Anyone who knows the URL can trigger a send. Vercel can pass a `CRON_SECRET` bearer token the route checks for; that isn't wired up yet.
- **No pagination on the dashboard.** Every job is fetched in one query, which is fine at a few hundred rows and not beyond.
- **Extraction trusts the model's JSON.** If Gemini returns something unparseable the request fails with a generic 500 rather than a useful message.
