'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/lib/language'
import { LANGUAGES, LANGUAGE_NAMES, Language, isLanguage } from '@/lib/i18n'
import Link from 'next/link'

const STATUSES = ['applied', 'interview', 'offer', 'rejected'] as const

const cardStyle = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '24px',
  marginBottom: '16px',
}

const headingStyle = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#111827',
  marginBottom: '8px',
}

const helpStyle = {
  fontSize: '13px',
  color: '#6b7280',
  marginBottom: '16px',
}

const inputStyle = {
  width: '100%',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  padding: '10px 12px',
  fontSize: '14px',
  boxSizing: 'border-box' as const,
}

export default function SettingsPage() {
  const router = useRouter()
  const { t, language, setLanguage } = useLanguage()

  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [geminiKey, setGeminiKey] = useState('')
  const [remindersEnabled, setRemindersEnabled] = useState(true)
  const [reminderDays, setReminderDays] = useState(7)
  const [defaultStatus, setDefaultStatus] = useState<string>('applied')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadSettings = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setUserId(user.id)
    setEmail(user.email ?? '')

    const { data } = await supabase
      .from('user_settings')
      .select('gemini_api_key, reminders_enabled, reminder_days, default_status, language')
      .eq('user_id', user.id)
      .maybeSingle()

    if (data) {
      if (data.gemini_api_key) setGeminiKey(data.gemini_api_key)
      if (typeof data.reminders_enabled === 'boolean') setRemindersEnabled(data.reminders_enabled)
      if (data.reminder_days) setReminderDays(data.reminder_days)
      if (data.default_status) setDefaultStatus(data.default_status)
      // The saved language wins over whatever this device had stored.
      if (isLanguage(data.language) && data.language !== language) setLanguage(data.language)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadSettings()
  }, [])

  const handleSave = async () => {
    if (!userId) return
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: userId,
          gemini_api_key: geminiKey.trim() || null,
          reminders_enabled: remindersEnabled,
          reminder_days: reminderDays,
          default_status: defaultStatus,
          language,
        }, { onConflict: 'user_id' })

      if (error) throw error
      setMessage(t('settings.saved'))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#6b7280' }}>{t('common.loading')}</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 24px' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', margin: 0 }}>{t('settings.title')}</h1>
          <Link href="/dashboard" style={{ fontSize: '14px', color: '#6b7280', textDecoration: 'none' }}>
            {t('common.backToDashboard')}
          </Link>
        </div>

        {/* Gemini API key */}
        <div style={cardStyle}>
          <h2 style={headingStyle}>{t('settings.keyHeading')}</h2>
          <p style={helpStyle}>
            {t('settings.keyGet')}{' '}
            <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" style={{ color: '#3b82f6' }}>aistudio.google.com</a>
            {'. '}
            {t('settings.keyHelp')}
          </p>
          <input
            type="password"
            value={geminiKey}
            onChange={(e) => setGeminiKey(e.target.value)}
            placeholder="AIza..."
            style={inputStyle}
          />
        </div>

        {/* Reminders */}
        <div style={cardStyle}>
          <h2 style={headingStyle}>{t('settings.remindersHeading')}</h2>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#374151', marginBottom: '16px' }}>
            <input
              type="checkbox"
              checked={remindersEnabled}
              onChange={(e) => setRemindersEnabled(e.target.checked)}
            />
            {t('settings.remindersEnabled')}
          </label>

          <label style={{ fontSize: '13px', color: '#374151', display: 'block', marginBottom: '6px' }}>
            {t('settings.reminderDays')}
          </label>
          <input
            type="number"
            min={1}
            max={30}
            value={reminderDays}
            disabled={!remindersEnabled}
            onChange={(e) => setReminderDays(Number(e.target.value))}
            style={{ ...inputStyle, maxWidth: '120px', opacity: remindersEnabled ? 1 : 0.5 }}
          />
          <p style={{ ...helpStyle, marginTop: '8px', marginBottom: 0 }}>{t('settings.reminderDaysHelp')}</p>
        </div>

        {/* New application defaults */}
        <div style={cardStyle}>
          <h2 style={headingStyle}>{t('settings.newApplicationsHeading')}</h2>
          <label style={{ fontSize: '13px', color: '#374151', display: 'block', marginBottom: '6px' }}>
            {t('settings.defaultStatus')}
          </label>
          <select
            value={defaultStatus}
            onChange={(e) => setDefaultStatus(e.target.value)}
            style={{ ...inputStyle, maxWidth: '200px' }}
          >
            {STATUSES.map(status => (
              <option key={status} value={status}>{t(`status.${status}`)}</option>
            ))}
          </select>
          <p style={{ ...helpStyle, marginTop: '8px', marginBottom: 0 }}>{t('settings.defaultStatusHelp')}</p>
        </div>

        {/* Language */}
        <div style={cardStyle}>
          <h2 style={headingStyle}>{t('settings.languageHeading')}</h2>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            style={{ ...inputStyle, maxWidth: '200px' }}
          >
            {LANGUAGES.map(code => (
              <option key={code} value={code}>{LANGUAGE_NAMES[code]}</option>
            ))}
          </select>
          <p style={{ ...helpStyle, marginTop: '8px', marginBottom: 0 }}>{t('settings.languageHelp')}</p>
        </div>

        {error && <p style={{ color: '#dc2626', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}
        {message && <p style={{ color: '#16a34a', fontSize: '13px', marginBottom: '12px' }}>{message}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          style={{ background: '#111827', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', opacity: saving ? 0.5 : 1, marginBottom: '32px' }}
        >
          {saving ? t('settings.saving') : t('settings.save')}
        </button>

        {/* Account */}
        <div style={cardStyle}>
          <h2 style={headingStyle}>{t('settings.accountHeading')}</h2>
          <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>
            {t('settings.signedInAs')} <strong style={{ color: '#374151' }}>{email}</strong>
          </p>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <Link href="/forgot-password" style={{ fontSize: '14px', color: '#3b82f6', textDecoration: 'none' }}>
              {t('settings.changePassword')}
            </Link>
            <button
              onClick={handleSignOut}
              style={{ fontSize: '14px', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              {t('settings.signOut')}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
