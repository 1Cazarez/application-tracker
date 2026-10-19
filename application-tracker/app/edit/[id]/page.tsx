'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/lib/language'
import { useAccount } from '@/lib/account'
import { errorMessage } from '@/lib/errors'
import { JobFieldValues, blankToNull, toJobFieldValues } from '@/lib/jobFields'
import { AppHeader } from '@/components/AppHeader'
import { JobFields } from '@/components/JobFields'
import { LoadingScreen } from '@/components/LoadingScreen'
import { CheckCircleIcon, AlertCircleIcon } from '@/lib/icons'

type LoadedJob = { values: JobFieldValues; originalDeadline: string } | 'not-found'

export default function EditPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const { t } = useLanguage()
  const account = useAccount()
  const [loaded, setLoaded] = useState<LoadedJob | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!account) return
    supabase
      .from('jobs')
      .select('*')
      .eq('id', id)
      .eq('user_id', account.user.id)
      .maybeSingle()
      .then(({ data: job }) => {
        setLoaded(job
          ? { values: toJobFieldValues(job), originalDeadline: job.deadline ?? '' }
          : 'not-found')
      })
  }, [account, id])

  if (!loaded) return <LoadingScreen />

  const values = loaded === 'not-found' ? null : loaded.values

  const setValues = (next: JobFieldValues) => {
    if (loaded !== 'not-found') setLoaded({ ...loaded, values: next })
  }

  const handleSave = async () => {
    if (loaded === 'not-found') return
    if (!loaded.values.company.trim() || !loaded.values.title.trim()) {
      setError(t('upload.requiredFields'))
      return
    }
    setSaving(true)
    setError(null)
    try {
      // The reminder job skips rows already marked sent, so a moved deadline
      // needs both flags cleared or its new date would never get an email.
      const deadlineChanged = loaded.values.deadline !== loaded.originalDeadline
      const { error } = await supabase
        .from('jobs')
        .update({
          ...blankToNull(loaded.values),
          ...(deadlineChanged && { reminder_sent: false, closed_notice_sent: false }),
        })
        .eq('id', id)
      if (error) throw error
      router.push('/dashboard')
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <AppHeader email={account?.user.email} />

      <main style={{ maxWidth: '720px', margin: '0 auto', padding: '32px 24px 80px' }}>
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: '0 0 4px' }}>
            {t('edit.title')}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0, lineHeight: 1.5 }}>
            {t('edit.subtitle')}
          </p>
        </div>

        {loaded === 'not-found' && (
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
