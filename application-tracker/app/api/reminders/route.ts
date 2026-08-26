import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

type Job = {
  id: string
  user_id: string | null
  company: string
  title: string
  deadline: string
  status: string
}

function buildEmail(jobs: Job[]) {
  const rows = jobs.map(job => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${job.company}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${job.title}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #dc2626; font-weight: 600;">${job.deadline}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${job.status}</td>
      </tr>
    `).join('')

  return `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h1 style="font-size: 24px; font-weight: 700; color: #111827;">Upcoming deadlines</h1>
          <p style="color: #6b7280;">You have ${jobs.length} application${jobs.length > 1 ? 's' : ''} with deadlines in the next 7 days.</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 24px;">
            <thead>
              <tr style="background: #f9fafb;">
                <th style="padding: 12px; text-align: left; font-size: 12px; color: #6b7280;">COMPANY</th>
                <th style="padding: 12px; text-align: left; font-size: 12px; color: #6b7280;">ROLE</th>
                <th style="padding: 12px; text-align: left; font-size: 12px; color: #6b7280;">DEADLINE</th>
                <th style="padding: 12px; text-align: left; font-size: 12px; color: #6b7280;">STATUS</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display: inline-block; margin-top: 24px; background: #111827; color: #fff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px;">
            View dashboard →
          </a>
        </div>
      `
}

export async function GET() {
  try {
    const today = new Date()
    const in7Days = new Date()
    in7Days.setDate(today.getDate() + 7)

    const todayStr = today.toISOString().split('T')[0]
    const in7DaysStr = in7Days.toISOString().split('T')[0]

    const { data: jobs, error } = await supabaseAdmin
      .from('jobs')
      .select('*')
      .gte('deadline', todayStr)
      .lte('deadline', in7DaysStr)
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
    const skipped: string[] = []

    for (const [ownerId, ownerJobs] of byOwner) {
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
        subject: `⚠️ ${ownerJobs.length} application deadline${ownerJobs.length > 1 ? 's' : ''} coming up!`,
        html: buildEmail(ownerJobs)
      })

      if (sendError) {
        skipped.push(`${ownerId ?? 'unowned'}: ${sendError.message}`)
        continue
      }

      // Only mark the jobs whose email actually went out.
      await supabaseAdmin
        .from('jobs')
        .update({ reminder_sent: true })
        .in('id', ownerJobs.map(j => j.id))

      sentJobs += ownerJobs.length
    }

    return NextResponse.json({
      message: `Sent reminders for ${sentJobs} jobs to ${byOwner.size - skipped.length} recipients`,
      ...(skipped.length > 0 && { skipped })
    })
  } catch (error) {
    console.error('Reminder error:', error)
    return NextResponse.json({ error: 'Failed to send reminders' }, { status: 500 })
  }
}
