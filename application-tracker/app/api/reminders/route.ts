import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { Language, isLanguage, translate } from '@/lib/i18n'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// Users choose a lead time up to this; the query fetches the widest window
// once and each user's own window is applied in memory.
const MAX_LEAD_DAYS = 30
const DEFAULT_LEAD_DAYS = 7

type Job = {
  id: string
  user_id: string | null
  company: string
  title: string
  deadline: string
  status: string
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

function buildEmail(jobs: Job[], language: Language, days: number) {
  const t = (key: Parameters<typeof translate>[1], params?: Record<string, string | number>) =>
    translate(language, key, params)

  const rows = jobs.map(job => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${job.company}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${job.title}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #dc2626; font-weight: 600;">${job.deadline}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${t(`status.${job.status}` as 'status.applied')}</td>
      </tr>
    `).join('')

  const intro = jobs.length === 1
    ? t('email.introOne', { days })
    : t('email.intro', { count: jobs.length, days })

  return `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h1 style="font-size: 24px; font-weight: 700; color: #111827;">${t('email.heading')}</h1>
          <p style="color: #6b7280;">${intro}</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 24px;">
            <thead>
              <tr style="background: #f9fafb;">
                <th style="padding: 12px; text-align: left; font-size: 12px; color: #6b7280;">${t('email.company')}</th>
                <th style="padding: 12px; text-align: left; font-size: 12px; color: #6b7280;">${t('email.role')}</th>
                <th style="padding: 12px; text-align: left; font-size: 12px; color: #6b7280;">${t('email.deadline')}</th>
                <th style="padding: 12px; text-align: left; font-size: 12px; color: #6b7280;">${t('email.status')}</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
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
    const { data: jobs, error } = await supabaseAdmin
      .from('jobs')
      .select('*')
      .gte('deadline', daysFromToday(0))
      .lte('deadline', daysFromToday(MAX_LEAD_DAYS))
      .eq('reminder_sent', false)
      .not('status', 'eq', 'rejected')

    if (error) throw error
    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ message: 'No upcoming deadlines' })
    }

    // Each owner gets their own digest; rows predating user ownership fall back
    // to REMINDER_EMAIL so they aren't silently dropped.
    const byOwner = new Map<string | null, Job[]>()
    for (const job of jobs as Job[]) {
      const owner = job.user_id ?? null
      const existing = byOwner.get(owner)
      if (existing) existing.push(job)
      else byOwner.set(owner, [job])
    }

    const fallbackEmail = process.env.REMINDER_EMAIL ?? null
    let sentJobs = 0
    let recipients = 0
    const skipped: string[] = []

    for (const [ownerId, ownerJobs] of byOwner) {
      const preferences = ownerId ? await loadPreferences(ownerId) : DEFAULT_PREFERENCES
      if (!preferences.remindersEnabled) continue

      // Narrow the shared 30-day window down to this user's lead time.
      const cutoff = daysFromToday(preferences.reminderDays)
      const dueJobs = ownerJobs.filter(job => job.deadline <= cutoff)
      if (dueJobs.length === 0) continue

      let toEmail = fallbackEmail
      if (ownerId) {
        const { data } = await supabaseAdmin.auth.admin.getUserById(ownerId)
        toEmail = data?.user?.email ?? fallbackEmail
      }

      if (!toEmail) {
        skipped.push(`${ownerId ?? 'unowned'}: no email address`)
        continue
      }

      const subject = dueJobs.length === 1
        ? translate(preferences.language, 'email.subjectOne')
        : translate(preferences.language, 'email.subject', { count: dueJobs.length })

      const { error: sendError } = await resend.emails.send({
        from: 'Application Tracker <onboarding@resend.dev>',
        to: toEmail,
        subject: `⚠️ ${subject}`,
        html: buildEmail(dueJobs, preferences.language, preferences.reminderDays)
      })

      if (sendError) {
        skipped.push(`${ownerId ?? 'unowned'}: ${sendError.message}`)
        continue
      }

      // Only mark the jobs whose email actually went out.
      await supabaseAdmin
        .from('jobs')
        .update({ reminder_sent: true })
        .in('id', dueJobs.map(j => j.id))

      sentJobs += dueJobs.length
      recipients += 1
    }

    return NextResponse.json({
      message: `Sent reminders for ${sentJobs} jobs to ${recipients} recipients`,
      ...(skipped.length > 0 && { skipped })
    })
  } catch (error) {
    console.error('Reminder error:', error)
    return NextResponse.json({ error: 'Failed to send reminders' }, { status: 500 })
  }
}
