'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/lib/language'
import { isLanguage } from '@/lib/i18n'
import Link from 'next/link'
import { AppHeader } from '@/components/AppHeader'
import {
  PlusIcon, SettingsIcon, LogOutIcon, DollarSignIcon, MapPinIcon, BriefcaseIcon,
  CalendarIcon, AlertTriangleIcon, ExternalLinkIcon, Trash2Icon,
} from '@/lib/icons'

const STATUSES = ['applied', 'interview', 'offer', 'rejected'] as const
type Status = (typeof STATUSES)[number]

const STATUS_STYLES: Record<Status, { background: string; color: string }> = {
  applied:   { background: '#dbeafe', color: '#1d4ed8' },
  interview: { background: '#fef3c7', color: '#d97706' },
  offer:     { background: '#dcfce7', color: '#15803d' },
  rejected:  { background: '#fee2e2', color: '#dc2626' },
}

export default function Dashboard() {
  const router = useRouter()
  const { t, language, setLanguage } = useLanguage()
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuthAndFetch()
  }, [])

  const checkAuthAndFetch = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // Follow the account's saved language, so it carries across devices.
    const { data: settings } = await supabase
      .from('user_settings')
      .select('language')
      .eq('user_id', user.id)
      .maybeSingle()
    if (isLanguage(settings?.language) && settings.language !== language) {
      setLanguage(settings.language)
    }

    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (!error && data) setJobs(data)
    setLoading(false)
  }

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('jobs').update({ status }).eq('id', id)
    setJobs(jobs.map(j => j.id === id ? { ...j, status } : j))
  }

  const deleteJob = async (id: string) => {
    await supabase.from('jobs').delete().eq('id', id)
    setJobs(jobs.filter(j => j.id !== id))
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const getDaysUntil = (deadline: string) => {
    if (!deadline) return null
    return Math.ceil((new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{t('common.loading')}</p>
    </div>
  )

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
              const days = getDaysUntil(job.deadline)
              const status = STATUS_STYLES[job.status as Status] ?? STATUS_STYLES.applied
              const urgent = days !== null && days <= 3
              return (
                <div key={job.id} className="card card-interactive" style={{
                  padding: '20px', borderLeft: `4px solid ${status.color}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 240px' }}>
                      <h2 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 4px' }}>{job.title}</h2>
                      <p style={{ fontSize: '14px', color: '#374151', margin: '0 0 10px', fontWeight: '500' }}>{job.company}</p>
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
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                      <select
                        value={job.status}
                        onChange={(e) => updateStatus(job.id, e.target.value)}
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
