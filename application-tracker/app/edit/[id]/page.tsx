'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/lib/language'
import { isLanguage } from '@/lib/i18n'
import { EMPTY_JOB, blankToNull } from '@/lib/jobFields'
import { AppHeader } from '@/components/AppHeader'
import { JobFields } from '@/components/JobFields'
import { ArrowLeftIcon, CheckCircleIcon, AlertCircleIcon } from '@/lib/icons'

export default function EditPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const { t, language, setLanguage } = useLanguage()
  const [values, setValues] = useState<Record<string, string> | null>(null)
  const [originalDeadline, setOriginalDeadline] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadJob = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: settings } = await supabase
      .from('user_settings')
      .select('language')
      .eq('user_id', user.id)
      .maybeSingle()
    if (isLanguage(settings?.language) && settings.language !== language) {
      setLanguage(settings.language)
    }

    const { data: job } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (job) {
      setValues(Object.fromEntries(Object.keys(EMPTY_JOB).map(key => [key, job[key] ?? ''])))
      setOriginalDeadline(job.deadline ?? '')
    } else {
      setNotFound(true)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadJob()
  }, [])

  const handleSave = async () => {
    if (!values) return
    if (!values.company.trim() || !values.title.trim()) {
      setError(t('upload.requiredFields'))
      return
    }
    setSaving(true)
    setError(null)
    try {
      // The reminder job skips rows already marked sent, so a moved deadline
      // needs the flag cleared or its new date would never get a reminder.
      const deadlineChanged = values.deadline !== originalDeadline
      const { error } = await supabase
        .from('jobs')
        .update({ ...blankToNull(values), ...(deadlineChanged && { reminder_sent: false }) })
        .eq('id', id)
      if (error) throw error
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message)
      setSaving(false)
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{t('common.loading')}</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <AppHeader
        maxWidth="640px"
        right={
          <Link href="/dashboard" className="link-accent" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
            <ArrowLeftIcon size={14} strokeWidth={2.25} />
            {t('common.backToDashboard').replace('← ', '')}
          </Link>
        }
      />

      <main style={{ maxWidth: '640px', margin: '0 auto', padding: '48px 24px 80px' }}>
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: '0 0 8px' }}>
            {t('edit.title')}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0, lineHeight: 1.5 }}>
            {t('edit.subtitle')}
          </p>
        </div>

        {notFound && (
          <div className="card" style={{ padding: '40px 32px', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px', marginBottom: '12px' }}>{t('edit.notFound')}</p>
            <Link href="/dashboard" className="link-accent" style={{ fontSize: '14px' }}>{t('common.backToDashboard')}</Link>
          </div>
        )}

        {values && (
          <>
            {error && (
              <div className="card fade-in-up" style={{
                background: 'var(--danger-soft)', borderColor: 'var(--danger-border)', padding: '14px 16px',
                marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'flex-start',
              }}>
                <AlertCircleIcon size={16} strokeWidth={2} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: '1px' }} />
                <p style={{ color: 'var(--danger)', fontSize: '13px', margin: 0 }}>{error}</p>
              </div>
            )}

            <div className="card fade-in-up" style={{ padding: '24px' }}>
              <JobFields values={values} onChange={setValues} />

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <Link href="/dashboard" className="btn btn-secondary">{t('edit.cancel')}</Link>
                <button onClick={handleSave} disabled={saving} className="btn btn-success" style={{ flex: 1 }}>
                  {saving ? <span className="spinner" /> : <CheckCircleIcon size={16} />}
                  {saving ? t('edit.saving') : t('edit.save')}
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
