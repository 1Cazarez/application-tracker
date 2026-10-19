'use client'

import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { supabase, supabaseKey, supabaseUrl } from '@/lib/supabase'
import { EASE_IN_OUT, EASE_OUT, prefersReducedMotion } from '@/lib/motion'
import { useLanguage } from '@/lib/language'
import { useAccount } from '@/lib/account'
import { Job, STATUSES, Status, todayISO } from '@/lib/jobFields'
import Link from 'next/link'
import { AppHeader } from '@/components/AppHeader'
import { CompanyLogo } from '@/components/CompanyLogo'
import { LoadingScreen } from '@/components/LoadingScreen'
import {
  PlusIcon, BriefcaseIcon, CalendarIcon, AlertTriangleIcon, ExternalLinkIcon, Trash2Icon, PencilIcon, SearchIcon,
} from '@/lib/icons'

const DAY_MS = 1000 * 60 * 60 * 24
const UPCOMING_LIMIT = 5
const RECENT_LIMIT = 4
const UNDO_MS = 5000
const UNDO_TOAST_ID = 'undo-delete'

function daysUntil(deadline: string) {
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / DAY_MS)
}

function isWithinLastWeek(timestamp: string) {
  return Date.now() - new Date(timestamp).getTime() < 7 * DAY_MS
}

// Dates are stored as YYYY-MM-DD. Parsing them as local midnight keeps the
// day from shifting in timezones behind UTC.
function parseDate(date: string) {
  return new Date(`${date}T00:00:00`)
}

function formatDate(date: string, language: string) {
  const parsed = parseDate(date)
  const sameYear = parsed.getFullYear() === new Date().getFullYear()
  return parsed.toLocaleDateString(language, { month: 'short', day: 'numeric', year: sameYear ? undefined : 'numeric' })
}

function relativeDay(timestamp: string, language: string) {
  const days = Math.round((new Date(timestamp).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / DAY_MS)
  const text = new Intl.RelativeTimeFormat(language, { numeric: 'auto' }).format(days, 'day')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

const STATUS_STYLES: Record<Status, { background: string; color: string }> = {
  saved:     { background: 'var(--status-saved-bg)', color: 'var(--status-saved-fg)' },
  applied:  { background: 'var(--status-applied-bg)', color: 'var(--status-applied-fg)' },
  interview: { background: 'var(--status-interview-bg)', color: 'var(--status-interview-fg)' },
  offer:     { background: 'var(--status-offer-bg)', color: 'var(--status-offer-fg)' },
  rejected:  { background: 'var(--status-rejected-bg)', color: 'var(--status-rejected-fg)' },
}

type Filter = Status | 'all'

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: 0,
}

const thStyle: React.CSSProperties = {
  padding: '10px 12px', fontWeight: 500, fontSize: '12px', textTransform: 'uppercase',
  letterSpacing: '0.04em', color: 'var(--text-secondary)', textAlign: 'left', whiteSpace: 'nowrap',
}

export default function Dashboard() {
  const { t, language } = useLanguage()
  const account = useAccount()
  const [jobs, setJobs] = useState<Job[] | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!account) return
    supabase
      .from('jobs')
      .select('*')
      .eq('user_id', account.user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setJobs(data ?? []))
  }, [account])

  const updateStatus = async (id: string, status: Status) => {
    // Moving a saved job to applied means it was just submitted, so stamp
    // today as the date applied unless one was already entered.
    const job = jobs?.find(j => j.id === id)
    const changes = status === 'applied' && job && !job.date_applied
      ? { status, date_applied: todayISO() }
      : { status }
    await supabase.from('jobs').update(changes).eq('id', id)
    setJobs(current => current && current.map(j => j.id === id ? { ...j, ...changes } : j))
  }

  const listRef = useRef<HTMLTableSectionElement>(null)
  // Row tops captured just before rows are removed or restored, so the other
  // rows can slide into place instead of jumping (FLIP).
  const topsBefore = useRef<Map<string, number> | null>(null)
  // Rows just brought back by Undo, which fade in instead of appearing.
  const restoredIds = useRef<Set<string>>(new Set())
  // Deleted rows waiting out the undo window before they leave the database.
  const pendingDeletes = useRef<Job[]>([])
  const commitTimer = useRef<number | undefined>(undefined)
  // Cached because a pagehide handler can't wait for getSession().
  const accessToken = useRef<string | null>(null)

  useLayoutEffect(() => {
    const before = topsBefore.current
    const restored = restoredIds.current
    topsBefore.current = null
    restoredIds.current = new Set()
    if (!listRef.current) return
    for (const row of Array.from(listRef.current.children) as HTMLElement[]) {
      const id = row.dataset.jobId ?? ''
      if (restored.has(id)) {
        row.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: EASE_OUT })
        continue
      }
      const top = before?.get(id)
      if (top === undefined) continue
      const dy = top - row.getBoundingClientRect().top
      if (dy === 0) continue
      row.animate(
        [{ transform: `translateY(${dy}px)` }, { transform: 'none' }],
        { duration: 250, easing: EASE_IN_OUT },
      )
    }
  }, [jobs])

  const captureRowTops = () => {
    if (prefersReducedMotion() || !listRef.current) return
    topsBefore.current = new Map(
      (Array.from(listRef.current.children) as HTMLElement[])
        .map(el => [el.dataset.jobId ?? '', el.getBoundingClientRect().top]),
    )
  }

  const restoreRows = (rows: Job[]) => {
    captureRowTops()
    restoredIds.current = new Set(rows.map(row => row.id))
    setJobs(current => {
      if (!current) return current
      const missing = rows.filter(row => !current.some(job => job.id === row.id))
      return [...current, ...missing].sort((a, b) => b.created_at.localeCompare(a.created_at))
    })
  }

  const takePendingDeletes = () => {
    window.clearTimeout(commitTimer.current)
    toast.dismiss(UNDO_TOAST_ID)
    const rows = pendingDeletes.current
    pendingDeletes.current = []
    return rows
  }

  const commitDeletes = async () => {
    const rows = takePendingDeletes()
    if (rows.length === 0) return
    const { error } = await supabase.from('jobs').delete().in('id', rows.map(row => row.id))
    if (error) {
      restoreRows(rows)
      toast.error(t('dashboard.deleteFailed'))
    }
  }

  const undoDeletes = () => {
    const rows = takePendingDeletes()
    if (rows.length > 0) restoreRows(rows)
  }

  const deleteJob = async (job: Job, row: HTMLElement) => {
    if (pendingDeletes.current.some(pending => pending.id === job.id)) return
    supabase.auth.getSession().then(({ data }) => { accessToken.current = data.session?.access_token ?? null })

    pendingDeletes.current = [...pendingDeletes.current, job]
    const count = pendingDeletes.current.length
    toast(count === 1 ? t('dashboard.deleted', { company: job.company }) : t('dashboard.deletedMany', { count }), {
      id: UNDO_TOAST_ID,
      duration: Infinity,
      action: { label: t('dashboard.undo'), onClick: undoDeletes },
    })
    window.clearTimeout(commitTimer.current)
    commitTimer.current = window.setTimeout(commitDeletes, UNDO_MS)

    const exit = row.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: EASE_OUT, fill: 'forwards' })
    await exit.finished
    // Undone while it was still fading out: keep the row.
    if (!pendingDeletes.current.some(pending => pending.id === job.id)) {
      exit.cancel()
      return
    }
    captureRowTops()
    setJobs(current => current && current.filter(other => other.id !== job.id))
  }

  const onLeave = useEffectEvent(() => { commitDeletes() })
  const onUndoShortcut = useEffectEvent((e: KeyboardEvent) => {
    if (!(e.metaKey || e.ctrlKey) || e.shiftKey || e.key.toLowerCase() !== 'z') return
    if (pendingDeletes.current.length === 0) return
    // Inside a text field, Ctrl/Cmd+Z keeps undoing typing.
    if ((e.target as HTMLElement).closest('input, textarea, select, [contenteditable="true"]')) return
    e.preventDefault()
    undoDeletes()
  })

  useEffect(() => {
    window.addEventListener('keydown', onUndoShortcut)
    return () => window.removeEventListener('keydown', onUndoShortcut)
  }, [])

  // Leaving the dashboard accepts any deletes still in their undo window. On
  // tab close the page can't wait for supabase-js, so a keepalive request
  // goes straight to the REST endpoint.
  useEffect(() => {
    const onPageHide = () => {
      const rows = pendingDeletes.current
      if (rows.length === 0 || !accessToken.current) return
      pendingDeletes.current = []
      fetch(`${supabaseUrl}/rest/v1/jobs?id=in.(${rows.map(row => row.id).join(',')})`, {
        method: 'DELETE',
        keepalive: true,
        headers: { apikey: supabaseKey, Authorization: `Bearer ${accessToken.current}` },
      })
    }
    window.addEventListener('pagehide', onPageHide)
    return () => {
      window.removeEventListener('pagehide', onPageHide)
      onLeave()
    }
  }, [])

  if (!jobs || !account) return <LoadingScreen />

  const total = jobs.length
  const counts = Object.fromEntries(
    STATUSES.map(status => [status, jobs.filter(job => job.status === status).length]),
  ) as Record<Status, number>
  const addedThisWeek = jobs.filter(job => isWithinLastWeek(job.created_at)).length
  const percentOf = (count: number) => (total ? Math.round((count / total) * 100) : 0)
  // Saved jobs haven't been sent anywhere, so they don't count toward responses.
  const submitted = total - counts.saved
  const heardBack = counts.interview + counts.offer + counts.rejected
  const responseRate = submitted ? Math.round((heardBack / submitted) * 100) : 0

  // Only saved jobs still have a deadline to act on.
  const upcoming = jobs
    .filter(job => job.deadline && job.status === 'saved' && daysUntil(job.deadline) >= 0)
    .sort((a, b) => (a.deadline ?? '').localeCompare(b.deadline ?? ''))
  const dueThisWeek = upcoming.filter(job => daysUntil(job.deadline ?? '') <= 7).length

  const search = query.trim().toLowerCase()
  const visible = jobs.filter(job =>
    (filter === 'all' || job.status === filter) &&
    (!search || job.company.toLowerCase().includes(search) || job.title.toLowerCase().includes(search)),
  )

  const stats = [
    {
      label: t('dashboard.statTotal'),
      value: total,
      note: t('dashboard.thisWeek', { count: addedThisWeek }),
      noteColor: addedThisWeek > 0 ? 'var(--success)' : 'var(--text-secondary)',
    },
    { label: t('dashboard.statInterviews'), value: counts.interview, note: t('dashboard.shareOfTotal', { percent: percentOf(counts.interview) }) },
    { label: t('dashboard.statOffers'), value: counts.offer, note: t('dashboard.shareOfTotal', { percent: percentOf(counts.offer) }) },
    { label: t('dashboard.statResponse'), value: `${responseRate}%`, note: t('dashboard.heardBack', { count: heardBack, total: submitted }) },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <AppHeader email={account.user.email} />

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px 80px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: 0 }}>{t('dashboard.title')}</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
              {t('dashboard.summary', { count: total, due: dueThisWeek })}
            </p>
          </div>
          <Link href="/upload" className="btn btn-accent">
            <PlusIcon size={16} strokeWidth={2.5} />
            {t('nav.add')}
          </Link>
        </div>

        {total === 0 ? (
          <div className="card" style={{ padding: '56px 32px', textAlign: 'center' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '12px', background: 'var(--accent-soft)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--accent)',
            }}>
              <BriefcaseIcon size={22} />
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px', marginBottom: '12px' }}>{t('dashboard.empty')}</p>
            <Link href="/upload" className="link-accent" style={{ fontSize: '14px' }}>{t('dashboard.addFirst')}</Link>
          </div>
        ) : (
          <>
            <section aria-label={t('dashboard.summaryLabel')} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              {stats.map(stat => (
                <div key={stat.label} className="card" style={{ padding: '20px' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500 }}>{stat.label}</p>
                  <p style={{ fontSize: '32px', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)', marginTop: '6px', lineHeight: 1.2 }}>
                    {stat.value}
                  </p>
                  <p style={{ fontSize: '13px', fontWeight: 500, color: stat.noteColor ?? 'var(--text-secondary)', marginTop: '4px' }}>{stat.note}</p>
                </div>
              ))}
            </section>

            <section aria-labelledby="pipeline-heading" className="card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: '4px 12px' }}>
                <h2 id="pipeline-heading" style={sectionTitleStyle}>{t('dashboard.pipeline')}</h2>
                <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{t('dashboard.pipelineHint')}</span>
              </div>
              <div
                role="img"
                aria-label={STATUSES.map(status => `${t(`status.${status}`)}: ${counts[status]}`).join(', ')}
                style={{ display: 'flex', gap: '3px', height: '12px', borderRadius: '999px', overflow: 'hidden', background: 'var(--border)' }}
              >
                {STATUSES.filter(status => counts[status] > 0).map(status => (
                  <div key={status} className="status-color" style={{ flex: counts[status], background: STATUS_STYLES[status].color }} />
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                {STATUSES.map(status => (
                  <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: STATUS_STYLES[status].color, flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-body)' }}>{t(`status.${status}`)}</span>
                    <span style={{ marginLeft: 'auto', fontWeight: 600, fontFamily: 'var(--font-geist-mono), monospace', color: 'var(--text-primary)' }}>
                      {counts[status]}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'flex-start' }}>

              <section aria-labelledby="applications-heading" className="card" style={{ flex: '999 1 560px', minWidth: 0, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border)' }}>
                  <h2 id="applications-heading" style={{ ...sectionTitleStyle, marginRight: 'auto' }}>{t('dashboard.applications')}</h2>
                  <label style={{
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '0 12px', minHeight: '40px', flex: '0 1 260px',
                    border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', background: 'var(--surface)',
                  }}>
                    <SearchIcon size={16} />
                    <span className="visually-hidden">{t('dashboard.search')}</span>
                    <input
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={t('dashboard.search')}
                      style={{ border: 'none', outline: 'none', background: 'transparent', font: 'inherit', fontSize: '14px', color: 'var(--text-primary)', width: '100%', minWidth: 0 }}
                    />
                  </label>
                </div>

                <div role="group" aria-label={t('dashboard.filterLabel')} style={{ padding: '12px 20px', display: 'flex', flexWrap: 'wrap', gap: '8px', borderBottom: '1px solid var(--border)' }}>
                  {(['all', ...STATUSES] as Filter[]).map(value => (
                    <button
                      key={value}
                      type="button"
                      className="chip"
                      aria-pressed={filter === value}
                      onClick={() => setFilter(value)}
                    >
                      {value === 'all' ? t('dashboard.all') : t(`status.${value}`)}
                      <span className="chip-count">{value === 'all' ? total : counts[value]}</span>
                    </button>
                  ))}
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', minWidth: '720px', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                      <tr>
                        <th scope="col" style={{ ...thStyle, paddingLeft: '20px' }}>{t('dashboard.colCompany')}</th>
                        <th scope="col" style={thStyle}>{t('dashboard.colStatus')}</th>
                        <th scope="col" style={thStyle}>{t('field.date_applied')}</th>
                        <th scope="col" style={thStyle}>{t('field.deadline')}</th>
                        <th scope="col" style={{ ...thStyle, paddingRight: '20px' }}><span className="visually-hidden">{t('dashboard.colActions')}</span></th>
                      </tr>
                    </thead>
                    <tbody ref={listRef}>
                      {visible.map(job => {
                        const days = job.deadline ? daysUntil(job.deadline) : null
                        const status = STATUS_STYLES[job.status] ?? STATUS_STYLES.applied
                        const urgent = job.status === 'saved' && days !== null && days >= 0 && days <= 3
                        const details = [job.location, job.job_type, job.pay].filter(Boolean).join(' · ')
                        return (
                          <tr key={job.id} data-job-id={job.id} className="job-row">
                            <td style={{ padding: '12px', paddingLeft: '20px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <CompanyLogo company={job.company} url={job.url} size={36} />
                                <div style={{ minWidth: 0 }}>
                                  <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{job.company}</p>
                                  <p style={{ color: 'var(--text-body)', fontSize: '13px' }}>{job.title}</p>
                                  {details && <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{details}</p>}
                                  {job.notes && <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px' }}>{job.notes}</p>}
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '12px' }}>
                              <select
                                value={job.status}
                                onChange={(e) => updateStatus(job.id, e.target.value as Status)}
                                aria-label={t('dashboard.statusFor', { company: job.company })}
                                className="status-color"
                                style={{
                                  background: status.background, color: status.color,
                                  border: 'none', borderRadius: '999px', padding: '5px 10px',
                                  fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                                }}
                              >
                                {STATUSES.map(value => (
                                  <option key={value} value={value}>{t(`status.${value}`)}</option>
                                ))}
                              </select>
                            </td>
                            <td style={{ padding: '12px', color: 'var(--text-body)', whiteSpace: 'nowrap' }}>
                              {job.date_applied ? formatDate(job.date_applied, language) : '—'}
                            </td>
                            <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>
                              {job.deadline && days !== null ? (
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                                  color: urgent ? 'var(--danger)' : days < 0 ? 'var(--text-secondary)' : 'var(--text-body)',
                                  fontWeight: urgent ? 600 : 400,
                                }}>
                                  {urgent ? <AlertTriangleIcon size={13} /> : <CalendarIcon size={13} />}
                                  {formatDate(job.deadline, language)}
                                  <span style={{ fontSize: '12px' }}>
                                    {days < 0 ? t('dashboard.closed') : t('dashboard.daysLeft', { count: days })}
                                  </span>
                                </span>
                              ) : (
                                <span style={{ color: 'var(--text-secondary)' }}>—</span>
                              )}
                            </td>
                            <td style={{ padding: '12px', paddingRight: '20px' }}>
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '2px' }}>
                                <Link href={`/edit/${job.id}`} className="icon-btn" aria-label={t('dashboard.editFor', { company: job.company })} title={t('dashboard.edit')}>
                                  <PencilIcon size={15} />
                                </Link>
                                {job.url && (
                                  <a href={job.url} target="_blank" rel="noreferrer" className="icon-btn" aria-label={t('dashboard.viewListingFor', { company: job.company })} title={t('dashboard.viewListing')}>
                                    <ExternalLinkIcon size={15} />
                                  </a>
                                )}
                                <button
                                  type="button"
                                  className="icon-btn icon-btn-danger"
                                  aria-label={t('dashboard.deleteFor', { company: job.company })}
                                  title={t('dashboard.delete')}
                                  onClick={(e) => {
                                    const row = e.currentTarget.closest<HTMLElement>('[data-job-id]')
                                    if (row) deleteJob(job, row)
                                  }}
                                >
                                  <Trash2Icon size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {visible.length === 0 && (
                    <p style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>{t('dashboard.noMatches')}</p>
                  )}
                </div>
              </section>

              <div style={{ flex: '1 1 300px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '24px' }}>

                <section aria-labelledby="deadlines-heading" className="card" style={{ padding: '18px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                    <CalendarIcon size={17} />
                    <h2 id="deadlines-heading" style={sectionTitleStyle}>{t('dashboard.upcoming')}</h2>
                  </div>
                  {upcoming.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', padding: '8px 0' }}>{t('dashboard.noUpcoming')}</p>
                  ) : (
                    <ul style={{ listStyle: 'none' }}>
                      {upcoming.slice(0, UPCOMING_LIMIT).map(job => {
                        const deadline = job.deadline ?? ''
                        const days = daysUntil(deadline)
                        const soon = days <= 3
                        const date = parseDate(deadline)
                        return (
                          <li key={job.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderTop: '1px solid var(--border)' }}>
                            <span style={{ width: 44, flexShrink: 0, textAlign: 'center', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '4px 0', lineHeight: 1.2 }}>
                              <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--danger)' }}>
                                {date.toLocaleDateString(language, { month: 'short' }).replace('.', '')}
                              </span>
                              <span style={{ display: 'block', fontSize: '17px', fontWeight: 600, color: 'var(--text-primary)' }}>{date.getDate()}</span>
                            </span>
                            <span style={{ flex: 1, minWidth: 0 }}>
                              <span style={{ display: 'block', fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{job.company}</span>
                              <span style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)' }}>{job.title}</span>
                            </span>
                            <span style={{
                              fontSize: '12px', fontWeight: 600, padding: '3px 8px', borderRadius: 'var(--radius-sm)', whiteSpace: 'nowrap',
                              background: soon ? 'var(--danger-soft)' : 'var(--warning-soft)',
                              color: soon ? 'var(--danger)' : 'var(--warning-text)',
                            }}>
                              {days === 0 ? t('dashboard.today') : t('dashboard.inDays', { count: days })}
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </section>

                <section aria-labelledby="recent-heading" className="card" style={{ padding: '18px 20px' }}>
                  <h2 id="recent-heading" style={{ ...sectionTitleStyle, marginBottom: '12px' }}>{t('dashboard.recent')}</h2>
                  <ol style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {jobs.slice(0, RECENT_LIMIT).map(job => (
                      <li key={job.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <span aria-hidden="true" style={{ width: 8, height: 8, marginTop: 7, flexShrink: 0, borderRadius: '50%', background: STATUS_STYLES[job.status]?.color }} />
                        <span>
                          <span style={{ display: 'block', fontSize: '14px', color: 'var(--text-body)' }}>
                            {t('dashboard.added', { company: job.company, title: job.title })}
                          </span>
                          <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)' }}>{relativeDay(job.created_at, language)}</span>
                        </span>
                      </li>
                    ))}
                  </ol>
                </section>

              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
