'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/lib/language'
import { TranslationKey, isLanguage } from '@/lib/i18n'
import { AppHeader } from '@/components/AppHeader'
import {
  ArrowLeftIcon, UploadCloudIcon, SparklesIcon, CheckCircleIcon, AlertCircleIcon,
  BuildingIcon, BriefcaseIcon, CalendarIcon, DollarSignIcon, MapPinIcon, LinkIcon, TagIcon, XIcon,
} from '@/lib/icons'

const EMPTY_JOB = {
  company: '',
  title: '',
  deadline: '',
  pay: '',
  location: '',
  url: '',
  job_type: '',
}

const FIELD_ICONS: Record<string, typeof BuildingIcon> = {
  company: BuildingIcon,
  title: BriefcaseIcon,
  deadline: CalendarIcon,
  pay: DollarSignIcon,
  location: MapPinIcon,
  url: LinkIcon,
  job_type: TagIcon,
}

export default function UploadPage() {
  const router = useRouter()
  const { t, language, setLanguage } = useLanguage()
  const [userId, setUserId] = useState<string | null>(null)
  const [defaultStatus, setDefaultStatus] = useState('applied')
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
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

  const processFile = (f: File) => {
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setExtracted(null)
    setManual(false)
    setError(null)
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) processFile(f)
  }

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f && f.type.startsWith('image/')) processFile(f)
  }

  const clearFile = () => {
    setFile(null)
    setPreview(null)
    setExtracted(null)
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
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{t('common.loading')}</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <AppHeader
        maxWidth="640px"
        right={
          <a href="/dashboard" className="link-accent" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
            <ArrowLeftIcon size={14} strokeWidth={2.25} />
            {t('common.backToDashboard').replace('← ', '')}
          </a>
        }
      />

      <main style={{ maxWidth: '640px', margin: '0 auto', padding: '48px 24px 80px' }}>
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: '0 0 8px' }}>
            {t('upload.title')}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0, lineHeight: 1.5 }}>
            {t('upload.subtitle')}
          </p>
        </div>

        {!manual && !extracted && (
          <div className="card fade-in-up" style={{ padding: '20px', marginBottom: '16px' }}>
            {!preview ? (
              <label
                className={`dropzone${dragging ? ' dragging' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  padding: '48px 24px', textAlign: 'center',
                }}
              >
                <input type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
                <div style={{
                  width: '52px', height: '52px', borderRadius: '14px', background: 'var(--accent-soft)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', color: 'var(--accent)',
                }}>
                  <UploadCloudIcon size={24} strokeWidth={2} />
                </div>
                <p style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text-primary)', margin: '0 0 4px' }}>
                  {t('upload.dropTitle')}
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', margin: 0 }}>{t('upload.dropHint')}</p>
              </label>
            ) : (
              <>
                <div style={{
                  position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden',
                  border: '1px solid var(--border)', marginBottom: '16px', lineHeight: 0,
                }}>
                  <img src={preview} alt={t('upload.preview')} style={{ width: '100%', display: 'block', maxHeight: '360px', objectFit: 'cover' }} />
                  <button
                    onClick={clearFile}
                    className="btn btn-secondary btn-sm"
                    style={{ position: 'absolute', top: '10px', right: '10px', boxShadow: 'var(--shadow-sm)' }}
                  >
                    <XIcon size={13} strokeWidth={2.5} />
                    {t('upload.changeImage')}
                  </button>
                </div>
                <button
                  onClick={handleExtract}
                  disabled={loading}
                  className="btn btn-accent"
                  style={{ width: '100%' }}
                >
                  {loading ? <span className="spinner" /> : <SparklesIcon size={16} />}
                  {loading ? t('upload.extracting') : t('upload.extract')}
                </button>
              </>
            )}
          </div>
        )}

        {!extracted && (
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', textAlign: 'center' }}>
            {t('upload.noScreenshot')}{' '}
            <button
              onClick={startManualEntry}
              className="link-accent"
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', padding: 0 }}
            >
              {t('upload.enterManually')}
            </button>
          </p>
        )}

        {error && (
          <div className="card fade-in-up" style={{
            background: 'var(--danger-soft)', borderColor: '#fecaca', padding: '14px 16px',
            marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'flex-start',
          }}>
            <AlertCircleIcon size={16} strokeWidth={2} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: '1px' }} />
            <div>
              <p style={{ color: 'var(--danger)', fontSize: '13px', margin: 0 }}>{error}</p>
              {needsKey && (
                <a href="/settings" className="link-accent" style={{ fontSize: '13px', color: 'var(--danger)' }}>{t('upload.goToSettings')}</a>
              )}
            </div>
          </div>
        )}

        {extracted && (
          <div className="card fade-in-up" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '9px', background: 'var(--success-soft)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)', flexShrink: 0,
              }}>
                <CheckCircleIcon size={16} strokeWidth={2.25} />
              </div>
              <h2 style={{ fontWeight: '700', fontSize: '16px', color: 'var(--text-primary)', margin: 0 }}>
                {manual ? t('upload.jobDetails') : t('upload.confirmDetails')}
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              {Object.entries(extracted).map(([key, value]) => {
                const Icon = FIELD_ICONS[key] ?? TagIcon
                return (
                  <div key={key} style={{ gridColumn: key === 'url' ? '1 / -1' : undefined }}>
                    <label style={{
                      fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)',
                      display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px',
                    }}>
                      <Icon size={13} strokeWidth={2.25} style={{ color: 'var(--text-tertiary)' }} />
                      {t(`field.${key}` as TranslationKey)}
                    </label>
                    <input
                      type={key === 'deadline' ? 'date' : 'text'}
                      className="field-input"
                      value={value as string}
                      onChange={(e) => setExtracted({ ...extracted, [key]: e.target.value })}
                    />
                  </div>
                )
              })}
            </div>

            <button
              onClick={handleSave}
              disabled={loading}
              className="btn btn-success"
              style={{ width: '100%', marginTop: '20px' }}
            >
              {loading ? <span className="spinner" /> : <CheckCircleIcon size={16} />}
              {loading ? t('upload.saving') : t('upload.save')}
            </button>
            {manual && (
              <button
                onClick={() => { setExtracted(null); setManual(false); setError(null) }}
                className="btn btn-ghost"
                style={{ display: 'block', margin: '12px auto 0', fontSize: '13px' }}
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
