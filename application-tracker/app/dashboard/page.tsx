'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/lib/language'
import { useAccount } from '@/lib/account'
import { Job, STATUSES, Status } from '@/lib/jobFields'
import Link from 'next/link'
import { AppHeader } from '@/components/AppHeader'
import { CompanyLogo } from '@/components/CompanyLogo'
import { LoadingScreen } from '@/components/LoadingScreen'
import {
  PlusIcon, SettingsIcon, LogOutIcon, DollarSignIcon, MapPinIcon, BriefcaseIcon,
  CalendarIcon, CalendarCheckIcon, AlertTriangleIcon, ExternalLinkIcon, Trash2Icon, PencilIcon,
} from '@/lib/icons'

const DAY_MS = 1000 * 60 * 60 * 24

function daysUntil(deadline: string) {
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / DAY_MS)
}

const STATUS_STYLES: Record<Status, { background: string; color: string }> = {
  applied:   { background: 'var(--status-applied-bg)', color: 'var(--status-applied-fg)' },
  interview: { background: 'var(--status-interview-bg)', color: 'var(--status-interview-fg)' },
  offer:     { background: 'var(--status-offer-bg)', color: 'var(--status-offer-fg)' },
  rejected:  { background: 'var(--status-rejected-bg)', color: 'var(--status-rejected-fg)' },
}

export default function Dashboard() {
  const router = useRouter()
  const { t } = useLanguage()
  const account = useAccount()
  const [jobs, setJobs] = useState<Job[] | null>(null)

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
    await supabase.from('jobs').update({ status }).eq('id', id)
    setJobs(current => current && current.map(job => job.id === id ? { ...job, status } : job))
  }

  const deleteJob = async (id: string) => {
    await supabase.from('jobs').delete().eq('id', id)
    setJobs(current => current && current.filter(job => job.id !== id))
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (!jobs) return <LoadingScreen />

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <AppHeader
        right={
          <>
            <Link href="/settings" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: 'var(--text-secondary)' }}>
              <SettingsIcon size={15} />
              {t('dashboard.settings')}
            </Link>
            <button
              onClick={handleSignOut}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <LogOutIcon size={15} />
              {t('dashboard.signOut')}
            </button>
            <Link href="/upload" className="btn btn-primary btn-sm">
              <PlusIcon size={14} strokeWidth={2.5} />
              {t('dashboard.add').replace('+ ', '')}
            </Link>
          </>
        }
      />

      <div style={{ maxWidth: '880px', margin: '0 auto', padding: '40px 24px 80px' }}>

        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: 0 }}>{t('dashboard.title')}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '6px' }}>{t('dashboard.total', { count: jobs.length })}</p>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '28px' }}>
          {STATUSES.map(status => (
            <div key={status} className="card" style={{ padding: '18px', textAlign: 'center' }}>
              <p style={{ fontSize: '26px', fontWeight: '800', color: STATUS_STYLES[status].color, margin: 0, letterSpacing: '-0.02em' }}>
                {jobs.filter(j => j.status === status).length}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: 500 }}>{t(`status.${status}`)}</p>
            </div>
          ))}
        </div>

        {/* Job cards */}
        {jobs.length === 0 ? (
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {jobs.map(job => {
              const days = job.deadline ? daysUntil(job.deadline) : null
              const status = STATUS_STYLES[job.status] ?? STATUS_STYLES.applied
              const urgent = days !== null && days <= 3
              return (
                <div key={job.id} className="card card-interactive" style={{
                  padding: '20px', borderLeft: `4px solid ${status.color}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 240px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <CompanyLogo company={job.company} url={job.url} size={40} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h2 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 4px' }}>{job.title}</h2>
                        <p style={{ fontSize: '14px', color: 'var(--text-body)', margin: '0 0 10px', fontWeight: '500' }}>{job.company}</p>
                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                          {job.pay && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                              <DollarSignIcon size={13} /> {job.pay}
                            </span>
                          )}
                          {job.location && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                              <MapPinIcon size={13} /> {job.location}
                            </span>
                          )}
                          {job.job_type && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                              <BriefcaseIcon size={13} /> {job.job_type}
                            </span>
                          )}
                          {job.date_applied && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                              <CalendarCheckIcon size={13} /> {t('dashboard.appliedOn', { date: job.date_applied })}
                            </span>
                          )}
                          {job.deadline && (
                            <span style={{
                              display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px',
                              color: urgent ? 'var(--danger)' : 'var(--text-secondary)', fontWeight: urgent ? '600' : '400',
                            }}>
                              {urgent ? <AlertTriangleIcon size={13} /> : <CalendarIcon size={13} />}
                              {job.deadline} {t('dashboard.daysLeft', { count: days ?? 0 })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                      <select
                        value={job.status}
                        onChange={(e) => updateStatus(job.id, e.target.value as Status)}
                        style={{
                          background: status.background, color: status.color,
                          border: 'none', borderRadius: '20px', padding: '4px 10px',
                          fontSize: '12px', fontWeight: '600', cursor: 'pointer', outline: 'none'
                        }}
                      >
                        {STATUSES.map(value => (
                          <option key={value} value={value}>{t(`status.${value}`)}</option>
                        ))}
                      </select>
                      <Link href={`/edit/${job.id}`} className="btn btn-secondary btn-sm">
                        <PencilIcon size={12} strokeWidth={2.25} />
                        {t('dashboard.edit')}
                      </Link>
                      {job.url && (
                        <a href={job.url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--info)' }}>
                          {t('dashboard.viewListing').replace(' ↗', '')} <ExternalLinkIcon size={11} />
                        </a>
                      )}
                      <button
                        onClick={() => deleteJob(job.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        <Trash2Icon size={11} /> {t('dashboard.delete')}
                      </button>
                    </div>
                  </div>
                  {job.notes && <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>{job.notes}</p>}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
