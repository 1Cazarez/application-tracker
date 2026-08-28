'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/lib/language'
import { TranslationKey, isLanguage } from '@/lib/i18n'

const EMPTY_JOB = {
  company: '',
  title: '',
  deadline: '',
  pay: '',
  location: '',
  url: '',
  job_type: '',
}

export default function UploadPage() {
  const router = useRouter()
  const { t, language, setLanguage } = useLanguage()
  const [userId, setUserId] = useState<string | null>(null)
  const [defaultStatus, setDefaultStatus] = useState('applied')
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [extracted, setExtracted] = useState<any>(null)
  const [manual, setManual] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [needsKey, setNeedsKey] = useState(false)

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setUserId(user.id)

    const { data: settings } = await supabase
      .from('user_settings')
      .select('default_status, language')
      .eq('user_id', user.id)
      .maybeSingle()
    if (settings?.default_status) setDefaultStatus(settings.default_status)
    if (isLanguage(settings?.language) && settings.language !== language) {
      setLanguage(settings.language)
    }

    setCheckingAuth(false)
  }

  useEffect(() => {
    checkAuth()
  }, [])

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setExtracted(null)
    setManual(false)
  }

  const startManualEntry = () => {
    setExtracted({ ...EMPTY_JOB })
    setManual(true)
    setError(null)
    setNeedsKey(false)
  }

  const handleExtract = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    setNeedsKey(false)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const formData = new FormData()
      formData.append('screenshot', file)

      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData
      })

      const data = await res.json()
      if (data.error) {
        if (data.needsKey) setNeedsKey(true)
        throw new Error(data.error)
      }
      setExtracted(data)
      setManual(false)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!extracted || !userId) return
    if (!extracted.company?.trim() || !extracted.title?.trim()) {
      setError(t('upload.requiredFields'))
      return
    }
    setLoading(true)
    setError(null)
    try {
      // Blank fields must go in as null, not '' — deadline is a date column
      // and Postgres rejects the empty string.
      const fields = Object.fromEntries(
        Object.entries(extracted).map(([key, value]) =>
          [key, typeof value === 'string' && value.trim() === '' ? null : value]
        )
      )

      const { error } = await supabase.from('jobs').insert([{
        ...fields,
        status: defaultStatus,
        user_id: userId,
      }])
      if (error) throw error
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (checkingAuth) return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#6b7280' }}>{t('common.loading')}</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <main style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', marginBottom: '24px' }}>{t('upload.title')}</h1>

        {!manual && (
          <>
            <input
              type="file"
              accept="image/*"
              onChange={handleFile}
              style={{ marginBottom: '16px', display: 'block' }}
            />

            {preview && (
              <img src={preview} alt={t('upload.preview')} style={{ width: '100%', borderRadius: '8px', marginBottom: '16px' }} />
            )}

            {file && !extracted && (
              <button
                onClick={handleExtract}
                disabled={loading}
                style={{ width: '100%', padding: '10px', background: '#111827', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', marginBottom: '16px', opacity: loading ? 0.5 : 1, fontSize: '14px', fontWeight: '600' }}
              >
                {loading ? t('upload.extracting') : t('upload.extract')}
              </button>
            )}
          </>
        )}

        {!extracted && (
          <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>
            {t('upload.noScreenshot')}{' '}
            <button
              onClick={startManualEntry}
              style={{ color: '#111827', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', padding: 0, textDecoration: 'underline' }}
            >
              {t('upload.enterManually')}
            </button>
          </p>
        )}

        {error && (
          <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
            <p style={{ color: '#dc2626', fontSize: '13px', margin: 0 }}>{error}</p>
            {needsKey && (
              <a href="/settings" style={{ color: '#dc2626', fontSize: '13px', fontWeight: '600' }}>{t('upload.goToSettings')}</a>
            )}
          </div>
        )}

        {extracted && (
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
            <h2 style={{ fontWeight: '600', marginBottom: '16px', color: '#111827' }}>
              {manual ? t('upload.jobDetails') : t('upload.confirmDetails')}
            </h2>
            {Object.entries(extracted).map(([key, value]) => (
              <div key={key} style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>{t(`field.${key}` as TranslationKey)}</label>
                <input
                  type={key === 'deadline' ? 'date' : 'text'}
                  style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '6px', padding: '8px 10px', fontSize: '14px', boxSizing: 'border-box' }}
                  value={value as string}
                  onChange={(e) => setExtracted({ ...extracted, [key]: e.target.value })}
                />
              </div>
            ))}
            <button
              onClick={handleSave}
              disabled={loading}
              style={{ width: '100%', padding: '10px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', marginTop: '8px', fontSize: '14px', fontWeight: '600', opacity: loading ? 0.5 : 1 }}
            >
              {loading ? t('upload.saving') : t('upload.save')}
            </button>
            {manual && (
              <button
                onClick={() => { setExtracted(null); setManual(false); setError(null) }}
                style={{ display: 'block', margin: '12px auto 0', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px' }}
              >
                {t('upload.useScreenshot')}
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
