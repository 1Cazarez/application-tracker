'use client'

import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/lib/language'
import { useAccount } from '@/lib/account'
import { errorMessage } from '@/lib/errors'
import { parsePastedJob } from '@/lib/parseJobText'
import {
  EMPTY_JOB, JOB_FIELDS, JobField, JobFieldValues, STATUSES, Status, blankToNull, toJobFieldValues, todayISO,
} from '@/lib/jobFields'
import { AppHeader } from '@/components/AppHeader'
import { JobFields } from '@/components/JobFields'
import { LoadingScreen } from '@/components/LoadingScreen'
import {
  UploadCloudIcon, SparklesIcon, CheckCircleIcon, AlertCircleIcon, XIcon, PencilIcon,
} from '@/lib/icons'

type Mode = 'screenshot' | 'paste' | 'manual'
const MODES: Mode[] = ['screenshot', 'paste', 'manual']

// A job saved for later has no date applied yet, so the form hides it.
const NOT_APPLIED_YET: ReadonlySet<JobField> = new Set(['date_applied'])

// The fields an extraction actually filled. Date applied is always set to
// today by us, so it never counts as found.
function filledFields(values: Partial<JobFieldValues>) {
  return new Set(JOB_FIELDS.filter(field => field !== 'date_applied' && values[field]?.trim()))
}

const accentButtonStyle: React.CSSProperties = { width: '100%', minHeight: '46px' }

export default function UploadPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const account = useAccount()
  const [mode, setMode] = useState<Mode>('screenshot')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const previewUrl = useRef<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [values, setValues] = useState<JobFieldValues>(() => ({ ...EMPTY_JOB, date_applied: todayISO() }))
  const [found, setFound] = useState<ReadonlySet<JobField>>(new Set())
  const [pasteText, setPasteText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [needsKey, setNeedsKey] = useState(false)
  // Null until the user picks one, so the account's default applies.
  const [status, setStatus] = useState<Status | null>(null)

  const showPreview = (url: string | null) => {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current)
    previewUrl.current = url
    setPreview(url)
  }

  const processFile = (f: File) => {
    setFile(f)
    showPreview(URL.createObjectURL(f))
    setError(null)
    setNeedsKey(false)
  }

  // A pasted image (Ctrl+V / Cmd+V) works the same as a dropped one.
  const onPasteImage = useEffectEvent((f: File) => processFile(f))
  useEffect(() => {
    if (mode !== 'screenshot') return
    const handlePaste = (e: ClipboardEvent) => {
      const image = Array.from(e.clipboardData?.files ?? []).find(f => f.type.startsWith('image/'))
      if (!image) return
      e.preventDefault()
      onPasteImage(image)
    }
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [mode])

  if (!account) return <LoadingScreen />

  const saveAs = status ?? account.settings?.default_status ?? 'applied'

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
    showPreview(null)
  }

  const switchMode = (next: Mode) => {
    setMode(next)
    setError(null)
    setNeedsKey(false)
  }

  const handleAutofillFromText = () => {
    if (!pasteText.trim()) return
    const parsed = parsePastedJob(pasteText)
    setValues({ ...EMPTY_JOB, date_applied: values.date_applied || todayISO(), ...parsed })
    setFound(filledFields(parsed))
    setError(null)
  }

  const handleExtract = async () => {
    if (!file) return
    setExtracting(true)
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
      const extracted = toJobFieldValues(data)
      setValues({ ...extracted, date_applied: values.date_applied || todayISO() })
      setFound(filledFields(extracted))
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setExtracting(false)
    }
  }

  const handleSave = async () => {
    if (!values.company.trim() || !values.title.trim()) {
      setError(t('upload.requiredFields'))
      setNeedsKey(false)
      return
    }
    setSaving(true)
    setError(null)
    try {
      const { error } = await supabase.from('jobs').insert([{
        ...blankToNull(values),
        // A saved job hasn't been applied to, whatever the form's date says.
        ...(saveAs === 'saved' && { date_applied: null }),
        status: saveAs,
        user_id: account.user.id,
      }])
      if (error) throw error
      router.push('/dashboard')
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <AppHeader email={account.user.email} />

      <main style={{ maxWidth: '1120px', margin: '0 auto', padding: '32px 24px 80px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ maxWidth: '560px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: 0 }}>
              {t('upload.title')}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px', lineHeight: 1.5 }}>
              {t('upload.subtitle')}
            </p>
          </div>
          <div role="tablist" aria-label={t('upload.modeLabel')} className="segmented">
            {MODES.map(value => (
              <button
                key={value}
                type="button"
                role="tab"
                id={`tab-${value}`}
                aria-selected={mode === value}
                aria-controls="source-panel"
                onClick={() => switchMode(value)}
              >
                {t(`upload.mode.${value}`)}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'flex-start' }}>

          <section
            id="source-panel"
            role="tabpanel"
            aria-labelledby={`tab-${mode}`}
            className="card"
            style={{ flex: '1 1 340px', minWidth: 0, padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            {mode === 'screenshot' && !preview && (
              <label
                className={`dropzone fade-in-up${dragging ? ' dragging' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px',
                  minHeight: '320px', padding: '32px 24px', textAlign: 'center',
                }}
              >
                <input type="file" accept="image/*" onChange={handleFile} className="visually-hidden" />
                <span style={{
                  width: '56px', height: '56px', borderRadius: '16px', background: 'var(--accent-soft)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)',
                }}>
                  <UploadCloudIcon size={26} strokeWidth={2} />
                </span>
                <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>{t('upload.dropTitle')}</span>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{t('upload.dropHint')}</span>
              </label>
            )}

            {mode === 'screenshot' && preview && (
              <>
                <div className="fade-in-up" style={{
                  position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden',
                  border: '1px solid var(--border)', lineHeight: 0,
                }}>
                  {/* A local blob URL, which next/image can't optimize anyway. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt={t('upload.preview')} style={{ width: '100%', display: 'block', maxHeight: '420px', objectFit: 'cover', objectPosition: 'top' }} />
                  <button
                    type="button"
                    onClick={clearFile}
                    className="btn btn-secondary btn-sm"
                    style={{ position: 'absolute', top: '10px', right: '10px', boxShadow: 'var(--shadow-sm)' }}
                  >
                    <XIcon size={13} strokeWidth={2.5} />
                    {t('upload.changeImage')}
                  </button>
                </div>
                <button type="button" onClick={handleExtract} disabled={extracting} className="btn btn-accent" style={accentButtonStyle}>
                  {extracting ? <span className="spinner" /> : <SparklesIcon size={16} />}
                  {extracting ? t('upload.extracting') : found.size ? t('upload.extractAgain') : t('upload.extract')}
                </button>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                  {t('upload.usesKey')}{' · '}
                  <Link href="/settings" className="link-accent">{t('upload.manageKey')}</Link>
                </p>
              </>
            )}

            {mode === 'paste' && (
              <div className="fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label htmlFor="paste-text" style={{ display: 'block', fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>
                    {t('upload.pasteTitle')}
                  </label>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>{t('upload.pasteHint')}</p>
                </div>
                <textarea
                  id="paste-text"
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder={t('upload.pastePlaceholder')}
                  className="field-input"
                  rows={11}
                  style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.55 }}
                />
                <button
                  type="button"
                  onClick={handleAutofillFromText}
                  disabled={!pasteText.trim()}
                  className="btn btn-accent"
                  style={accentButtonStyle}
                >
                  <SparklesIcon size={16} />
                  {t('upload.autofill')}
                </button>
              </div>
            )}

            {mode === 'manual' && (
              <div className="fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '4px' }}>
                <span style={{
                  width: '48px', height: '48px', borderRadius: '14px', background: 'var(--surface-hover)', border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-body)',
                }}>
                  <PencilIcon size={20} />
                </span>
                <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>{t('upload.manualTitle')}</h2>
                <ul style={{ paddingLeft: '18px', color: 'var(--text-body)', fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <li>{t('upload.manualTip1')}</li>
                  <li>{t('upload.manualTip2')}</li>
                  <li>{t('upload.manualTip3')}</li>
                </ul>
              </div>
            )}
          </section>

          <section aria-labelledby="details-heading" className="card" style={{ flex: '999 1 520px', minWidth: 0 }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 12px' }}>
              <h2 id="details-heading" style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginRight: 'auto' }}>
                {found.size ? t('upload.confirmDetails') : t('upload.jobDetails')}
              </h2>
              {found.size > 0 && (
                <span className="fade-in-up" style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 10px', borderRadius: '999px',
                  fontSize: '12px', fontWeight: 600, background: 'var(--accent-soft)', color: 'var(--accent)',
                }}>
                  <SparklesIcon size={12} strokeWidth={2.25} />
                  {t('upload.foundCount', { count: found.size })}
                </span>
              )}
            </div>

            <div style={{ padding: '20px 24px' }}>
              <JobFields
                values={values}
                onChange={setValues}
                highlighted={found}
                hidden={saveAs === 'saved' ? NOT_APPLIED_YET : undefined}
              />
            </div>

            {error && (
              <div role="alert" className="fade-in-up" style={{
                margin: '0 24px 4px', padding: '12px 14px', borderRadius: 'var(--radius-md)',
                background: 'var(--danger-soft)', border: '1px solid var(--danger-border)',
                display: 'flex', gap: '10px', alignItems: 'flex-start',
              }}>
                <AlertCircleIcon size={16} strokeWidth={2} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: '1px' }} />
                <div>
                  <p style={{ color: 'var(--danger)', fontSize: '13px' }}>{error}</p>
                  {needsKey && (
                    <Link href="/settings" className="link-accent" style={{ fontSize: '13px', color: 'var(--danger)' }}>{t('upload.goToSettings')}</Link>
                  )}
                </div>
              </div>
            )}

            <div style={{ padding: '16px 24px 20px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', marginRight: 'auto', display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <label htmlFor="save-as-status">{t('upload.savesAs')}</label>
                <select
                  id="save-as-status"
                  value={saveAs}
                  onChange={(e) => setStatus(e.target.value as Status)}
                  className="status-color"
                  style={{
                    background: `var(--status-${saveAs}-bg)`, color: `var(--status-${saveAs}-fg)`,
                    border: 'none', borderRadius: '999px', padding: '4px 10px',
                    fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {STATUSES.map(value => (
                    <option key={value} value={value}>{t(`status.${value}`)}</option>
                  ))}
                </select>
                {' · '}
                <Link href="/settings" className="link-accent">{t('upload.changeDefault')}</Link>
              </span>
              <Link href="/dashboard" className="btn btn-ghost" style={{ padding: '11px 14px' }}>{t('edit.cancel')}</Link>
              <button type="button" onClick={handleSave} disabled={saving || extracting} className="btn btn-success">
                {saving ? <span className="spinner" /> : <CheckCircleIcon size={16} />}
                {saving ? t('upload.saving') : t('upload.save')}
              </button>
            </div>
          </section>

        </div>
      </main>
    </div>
  )
}
