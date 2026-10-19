import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { Language, TranslationKey, isLanguage, translate } from '@/lib/i18n'
import type { Job } from '@/lib/jobFields'

const resend = new Resend(process.env.RESEND_API_KEY)

// Users choose a lead time up to this; the query fetches the widest window
// once and each user's own window is applied in memory.
const MAX_LEAD_DAYS = 30
const DEFAULT_LEAD_DAYS = 7

// The "applications have closed" notice only covers deadlines this recent, so
// a backlog of long-closed applications doesn't all get mailed at once.
const CLOSED_LOOKBACK_DAYS = 7

type ReminderJob = Pick<Job, 'id' | 'user_id' | 'company' | 'title'> & { deadline: string }

type Digest = {
  // Saved jobs whose deadline is coming up: still time to apply.
  upcoming: ReminderJob[]
  // Applied jobs whose deadline has passed: time to watch for a reply.
  closed: ReminderJob[]
}

type Preferences = {
  remindersEnabled: boolean
  reminderDays: number
  language: Language
}

const DEFAULT_PREFERENCES: Preferences = {
  remindersEnabled: true,
  reminderDays: DEFAULT_LEAD_DAYS,
  language: 'en',
}

const REMINDER_COLUMNS = 'id, user_id, company, title, deadline'

/**
 * Vercel sends `Authorization: Bearer $CRON_SECRET` on scheduled invocations
 * when CRON_SECRET is set on the project. Without this the route is a public
 * URL anyone can use to fire everyone's reminder emails.
 */
function isAuthorizedCron(req: NextRequest, secret: string) {
  const header = req.headers.get('authorization') ?? ''
  const expected = Buffer.from(`Bearer ${secret}`)
  const received = Buffer.from(header)
  return expected.length === received.length && timingSafeEqual(expected, received)
}

function daysFromToday(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}

// Company and title come from user input and model output, so they're
// escaped before going into the email's HTML.
function escapeHtml(text: string) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function buildSubject({ upcoming, closed }: Digest, language: Language) {
  const parts: string[] = []
  if (upcoming.length > 0) {
    parts.push(upcoming.length === 1
      ? `⚠️ ${translate(language, 'email.subjectOne')}`
      : `⚠️ ${translate(language, 'email.subject', { count: upcoming.length })}`)
  }
  if (closed.length > 0) {
    parts.push(closed.length === 1
      ? translate(language, 'email.closedSubjectOne')
      : translate(language, 'email.closedSubject', { count: closed.length }))
  }
  return parts.join(' · ')
}

function buildEmail({ upcoming, closed }: Digest, language: Language, days: number) {
  const t = (key: TranslationKey, params?: Record<string, string | number>) =>
    translate(language, key, params)

  const cell = 'padding: 12px; border-bottom: 1px solid #e5e7eb;'
  const header = 'padding: 12px; text-align: left; font-size: 12px; color: #6b7280;'

  const section = (heading: string, intro: string, jobs: ReminderJob[], dateHeader: string, dateColor: string) => `
          <h1 style="font-size: 24px; font-weight: 700; color: #111827; margin-top: 32px;">${heading}</h1>
          <p style="color: #6b7280;">${intro}</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
            <thead>
              <tr style="background: #f9fafb;">
                <th style="${header}">${t('email.company')}</th>
                <th style="${header}">${t('email.role')}</th>
                <th style="${header}">${dateHeader}</th>
              </tr>
            </thead>
            <tbody>${jobs.map(job => `
              <tr>
                <td style="${cell}">${escapeHtml(job.company)}</td>
                <td style="${cell}">${escapeHtml(job.title)}</td>
                <td style="${cell} color: ${dateColor}; font-weight: 600;">${job.deadline}</td>
              </tr>`).join('')}
            </tbody>
          </table>`

  const sections: string[] = []
  if (upcoming.length > 0) {
    const intro = upcoming.length === 1
      ? t('email.introOne', { days })
      : t('email.intro', { count: upcoming.length, days })
    sections.push(section(t('email.heading'), intro, upcoming, t('email.deadline'), '#dc2626'))
  }
  if (closed.length > 0) {
    const intro = closed.length === 1
      ? t('email.closedIntroOne')
      : t('email.closedIntro', { count: closed.length })
    sections.push(section(t('email.closedHeading'), intro, closed, t('email.closedOn'), '#374151'))
  }

  return `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 0 24px 24px;">
          ${sections.join('')}
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display: inline-block; margin-top: 24px; background: #111827; color: #fff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px;">
            ${t('email.viewDashboard')}
          </a>
        </div>
      `
}

async function loadPreferences(userId: string): Promise<Preferences> {
  const { data } = await supabaseAdmin
    .from('user_settings')
    .select('reminders_enabled, reminder_days, language')
    .eq('user_id', userId)
    .maybeSingle()

  if (!data) return DEFAULT_PREFERENCES

  return {
    remindersEnabled: data.reminders_enabled ?? true,
    reminderDays: data.reminder_days ?? DEFAULT_LEAD_DAYS,
    language: isLanguage(data.language) ? data.language : 'en',
  }
}

export async function GET(req: NextRequest) {
  // Fail closed: an unset secret means the route would otherwise be open.
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('CRON_SECRET is not set; refusing to run reminders.')
    return NextResponse.json({ error: 'Reminders are not configured' }, { status: 500 })
  }

  if (!isAuthorizedCron(req, cronSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const today = daysFromToday(0)
    const [upcomingResult, closedResult] = await Promise.all([
      supabaseAdmin
        .from('jobs')
        .select(REMINDER_COLUMNS)
        .eq('status', 'saved')
        .eq('reminder_sent', false)
        .gte('deadline', today)
        .lte('deadline', daysFromToday(MAX_LEAD_DAYS)),
      supabaseAdmin
        .from('jobs')
        .select(REMINDER_COLUMNS)
        .eq('status', 'applied')
        .eq('closed_notice_sent', false)
        .lt('deadline', today)
        .gte('deadline', daysFromToday(-CLOSED_LOOKBACK_DAYS)),
    ])

    if (upcomingResult.error) throw upcomingResult.error
    if (closedResult.error) throw closedResult.error

    const upcomingJobs = (upcomingResult.data ?? []) as ReminderJob[]
    const closedJobs = (closedResult.data ?? []) as ReminderJob[]
    if (upcomingJobs.length === 0 && closedJobs.length === 0) {
      return NextResponse.json({ message: 'Nothing to send' })
    }

    // Each owner gets their own digest; rows predating user ownership fall back
    // to REMINDER_EMAIL so they aren't silently dropped.
    const byOwner = new Map<string | null, Digest>()
    const digestFor = (owner: string | null) => {
      let digest = byOwner.get(owner)
      if (!digest) {
        digest = { upcoming: [], closed: [] }
        byOwner.set(owner, digest)
      }
      return digest
    }
    for (const job of upcomingJobs) digestFor(job.user_id).upcoming.push(job)
    for (const job of closedJobs) digestFor(job.user_id).closed.push(job)

    const fallbackEmail = process.env.REMINDER_EMAIL ?? null
    let sentJobs = 0
    let recipients = 0
    const skipped: string[] = []

    for (const [ownerId, ownerDigest] of byOwner) {
      const preferences = ownerId ? await loadPreferences(ownerId) : DEFAULT_PREFERENCES
      if (!preferences.remindersEnabled) continue

      // Narrow the shared 30-day window down to this user's lead time.
      const cutoff = daysFromToday(preferences.reminderDays)
      const digest: Digest = {
        upcoming: ownerDigest.upcoming.filter(job => job.deadline <= cutoff),
        closed: ownerDigest.closed,
      }
      if (digest.upcoming.length === 0 && digest.closed.length === 0) continue

      let toEmail = fallbackEmail
      if (ownerId) {
        const { data } = await supabaseAdmin.auth.admin.getUserById(ownerId)
        toEmail = data?.user?.email ?? fallbackEmail
      }

      if (!toEmail) {
        skipped.push(`${ownerId ?? 'unowned'}: no email address`)
        continue
      }

      const { error: sendError } = await resend.emails.send({
        from: 'Application Tracker <onboarding@resend.dev>',
        to: toEmail,
        subject: buildSubject(digest, preferences.language),
        html: buildEmail(digest, preferences.language, preferences.reminderDays),
      })

      if (sendError) {
        skipped.push(`${ownerId ?? 'unowned'}: ${sendError.message}`)
        continue
      }

      // Only mark the jobs whose email actually went out.
      if (digest.upcoming.length > 0) {
        await supabaseAdmin
          .from('jobs')
          .update({ reminder_sent: true })
          .in('id', digest.upcoming.map(job => job.id))
      }
      if (digest.closed.length > 0) {
        await supabaseAdmin
          .from('jobs')
          .update({ closed_notice_sent: true })
          .in('id', digest.closed.map(job => job.id))
      }

      sentJobs += digest.upcoming.length + digest.closed.length
      recipients += 1
    }

    return NextResponse.json({
      message: `Sent reminders for ${sentJobs} jobs to ${recipients} recipients`,
      ...(skipped.length > 0 && { skipped }),
    })
  } catch (error) {
    console.error('Reminder error:', error)
    return NextResponse.json({ error: 'Failed to send reminders' }, { status: 500 })
  }
}
