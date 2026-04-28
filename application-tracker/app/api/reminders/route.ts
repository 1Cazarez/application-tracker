import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

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

    const toEmail = process.env.REMINDER_EMAIL
    if (!toEmail) {
      return NextResponse.json({ error: 'REMINDER_TO_EMAIL not configured' }, { status: 500 })
    }

    const jobList = jobs.map(job => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${job.company}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${job.title}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #dc2626; font-weight: 600;">${job.deadline}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${job.status}</td>
      </tr>
    `).join('')

    await resend.emails.send({
      from: 'Application Tracker <onboarding@resend.dev>',
      to: toEmail,
      subject: `⚠️ ${jobs.length} application deadline${jobs.length > 1 ? 's' : ''} coming up!`,
      html: `
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
            <tbody>${jobList}</tbody>
          </table>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display: inline-block; margin-top: 24px; background: #111827; color: #fff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px;">
            View dashboard →
          </a>
        </div>
      `
    })

    await supabaseAdmin
      .from('jobs')
      .update({ reminder_sent: true })
      .in('id', jobs.map(j => j.id))

    return NextResponse.json({ message: `Sent reminder for ${jobs.length} jobs` })
  } catch (error) {
    console.error('Reminder error:', error)
    return NextResponse.json({ error: 'Failed to send reminders' }, { status: 500 })
  }
}
