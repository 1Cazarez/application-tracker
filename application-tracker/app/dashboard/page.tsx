'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/lib/language'
import { isLanguage } from '@/lib/i18n'
import Link from 'next/link'

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
    <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#6b7280' }}>{t('common.loading')}</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#111827', margin: 0 }}>{t('dashboard.title')}</h1>
            <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>{t('dashboard.total', { count: jobs.length })}</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Link href="/upload" style={{
              background: '#111827', color: '#fff', padding: '10px 20px',
              borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: '500'
            }}>
              {t('dashboard.add')}
            </Link>
            <Link href="/settings" style={{ fontSize: '14px', color: '#6b7280', textDecoration: 'none' }}>
              {t('dashboard.settings')}
            </Link>
            <button
              onClick={handleSignOut}
              style={{ fontSize: '14px', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              {t('dashboard.signOut')}
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '32px' }}>
          {STATUSES.map(status => (
            <div key={status} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
              <p style={{ fontSize: '24px', fontWeight: '700', color: STATUS_STYLES[status].color, margin: 0 }}>
                {jobs.filter(j => j.status === status).length}
              </p>
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{t(`status.${status}`)}</p>
            </div>
          ))}
        </div>

        {/* Job cards */}
        {jobs.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '48px', textAlign: 'center' }}>
            <p style={{ color: '#6b7280', fontSize: '16px' }}>{t('dashboard.empty')}</p>
            <Link href="/upload" style={{ color: '#111827', fontWeight: '600', fontSize: '14px' }}>{t('dashboard.addFirst')}</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {jobs.map(job => {
              const days = getDaysUntil(job.deadline)
              const status = STATUS_STYLES[job.status as Status] ?? STATUS_STYLES.applied
              const urgent = days !== null && days <= 3
              return (
                <div key={job.id} style={{
                  background: '#fff', border: '1px solid #e5e7eb',
                  borderRadius: '12px', padding: '20px',
                  borderLeft: `4px solid ${status.color}`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: '0 0 4px' }}>{job.title}</h2>
                      <p style={{ fontSize: '14px', color: '#374151', margin: '0 0 8px', fontWeight: '500' }}>{job.company}</p>
                      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                        {job.pay && <span style={{ fontSize: '13px', color: '#6b7280' }}>💰 {job.pay}</span>}
                        {job.location && <span style={{ fontSize: '13px', color: '#6b7280' }}>📍 {job.location}</span>}
                        {job.job_type && <span style={{ fontSize: '13px', color: '#6b7280' }}>💼 {job.job_type}</span>}
                        {job.deadline && (
                          <span style={{ fontSize: '13px', color: urgent ? '#dc2626' : '#6b7280', fontWeight: urgent ? '600' : '400' }}>
                            {urgent ? '⚠️' : '📅'} {job.deadline} {t('dashboard.daysLeft', { count: days ?? 0 })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', marginLeft: '16px' }}>
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
                        <a href={job.url} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#3b82f6', textDecoration: 'none' }}>
                          {t('dashboard.viewListing')}
                        </a>
                      )}
                      <button
                        onClick={() => deleteJob(job.id)}
                        style={{ fontSize: '12px', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        {t('dashboard.delete')}
                      </button>
                    </div>
                  </div>
                  {job.notes && <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f3f4f6' }}>{job.notes}</p>}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}