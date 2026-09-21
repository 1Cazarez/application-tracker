'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/lib/language'
import { isLanguage } from '@/lib/i18n'
import { parsePastedJob } from '@/lib/parseJobText'
import { EMPTY_JOB, blankToNull } from '@/lib/jobFields'
import { AppHeader } from '@/components/AppHeader'
import { JobFields } from '@/components/JobFields'
import {
  ArrowLeftIcon, UploadCloudIcon, SparklesIcon, CheckCircleIcon, AlertCircleIcon,
  XIcon, ClipboardIcon,
} from '@/lib/icons'

const linkButtonStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', padding: 0,
}

const todayISO = () => new Date().toISOString().split('T')[0]

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
  const [entryMode, setEntryMode] = useState<'screenshot' | 'manual' | 'paste'>('screenshot')
  const [pasteText, setPasteText] = useState('')
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
    setEntryMode('screenshot')
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
    setExtracted({ ...EMPTY_JOB, date_applied: todayISO() })
    setEntryMode('manual')
    setError(null)
    setNeedsKey(false)
  }

  const startPasteEntry = () => {
    setPasteText('')
    setEntryMode('paste')
    setError(null)
    setNeedsKey(false)
  }

  const handleAutofillFromText = () => {
    if (!pasteText.trim()) return
    setExtracted({ ...EMPTY_JOB, date_applied: todayISO(), ...parsePastedJob(pasteText) })
    setError(null)
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
      setExtracted({ ...EMPTY_JOB, date_applied: todayISO(), ...data })
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
      const { error } = await supabase.from('jobs').insert([{
        ...blankToNull(extracted),
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

        {entryMode === 'screenshot' && !extracted && (
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

        {entryMode === 'paste' && !extracted && (
          <div className="card fade-in-up" style={{ padding: '20px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '14px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px', background: 'var(--accent-soft)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', flexShrink: 0,
              }}>
                <ClipboardIcon size={17} strokeWidth={2} />
              </div>
              <div>
                <p style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text-primary)', margin: '0 0 2px' }}>
                  {t('upload.pasteTitle')}
                </p>
                <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0 }}>{t('upload.pasteHint')}</p>
              </div>
            </div>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={t('upload.pastePlaceholder')}
              className="field-input"
              rows={8}
              style={{ resize: 'vertical', marginBottom: '14px', fontFamily: 'inherit' }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={() => setEntryMode('screenshot')} className="btn btn-secondary">
                <XIcon size={13} strokeWidth={2.5} />
              </button>
              <button
                type="button"
                onClick={handleAutofillFromText}
                disabled={!pasteText.trim()}
                className="btn btn-accent"
                style={{ flex: 1 }}
              >
                <SparklesIcon size={16} />
                {t('upload.autofill')}
              </button>
            </div>
          </div>
        )}

        {entryMode === 'screenshot' && !extracted && (
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', textAlign: 'center' }}>
            {t('upload.noScreenshot')}{' '}
            <button onClick={startPasteEntry} className="link-accent" style={linkButtonStyle}>
              {t('upload.pasteInstead')}
            </button>
            {' '}{t('common.or')}{' '}
            <button onClick={startManualEntry} className="link-accent" style={linkButtonStyle}>
              {t('upload.enterManually')}
            </button>
          </p>
        )}

        {error && (
          <div className="card fade-in-up" style={{
            background: 'var(--danger-soft)', borderColor: 'var(--danger-border)', padding: '14px 16px',
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
                {entryMode === 'screenshot' ? t('upload.confirmDetails') : t('upload.jobDetails')}
              </h2>
            </div>

            <JobFields values={extracted} onChange={setExtracted} />

            <button
              onClick={handleSave}
              disabled={loading}
              className="btn btn-success"
              style={{ width: '100%', marginTop: '20px' }}
            >
              {loading ? <span className="spinner" /> : <CheckCircleIcon size={16} />}
              {loading ? t('upload.saving') : t('upload.save')}
            </button>
            {entryMode !== 'screenshot' && (
              <button
                onClick={() => { setExtracted(null); setEntryMode('screenshot'); setError(null) }}
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
