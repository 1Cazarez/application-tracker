'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/lib/language'
import { LANGUAGES, LANGUAGE_NAMES, Language, isLanguage } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'
import { ACCENTS, ACCENT_SWATCHES, THEME_MODES } from '@/lib/theme-config'
import { AppHeader } from '@/components/AppHeader'
import { ArrowLeftIcon, LogOutIcon, SunIcon, MoonIcon, MonitorIcon, CheckIcon } from '@/lib/icons'

const STATUSES = ['applied', 'interview', 'offer', 'rejected'] as const

const MODE_ICONS = { system: MonitorIcon, light: SunIcon, dark: MoonIcon }

const cardStyle = {
  padding: '24px',
  marginBottom: '16px',
}

const headingStyle = {
  fontSize: '16px',
  fontWeight: '700',
  color: 'var(--text-primary)',
  marginBottom: '8px',
}

const helpStyle = {
  fontSize: '13px',
  color: 'var(--text-secondary)',
  marginBottom: '16px',
  lineHeight: 1.5,
}

export default function SettingsPage() {
  const router = useRouter()
  const { t, language, setLanguage } = useLanguage()
  const { mode, accent, setMode, setAccent } = useTheme()

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

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '40px 24px 80px' }}>

        <h1 style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: '0 0 28px' }}>{t('settings.title')}</h1>

        {/* Gemini API key */}
        <div className="card" style={cardStyle}>
          <h2 style={headingStyle}>{t('settings.keyHeading')}</h2>
          <p style={helpStyle}>
            {t('settings.keyGet')}{' '}
            <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" className="link-accent">aistudio.google.com</a>
            {'. '}
            {t('settings.keyHelp')}
          </p>
          <input
            type="password"
            value={geminiKey}
            onChange={(e) => setGeminiKey(e.target.value)}
            placeholder="AIza..."
            className="field-input"
          />
        </div>

        {/* Reminders */}
        <div className="card" style={cardStyle}>
          <h2 style={headingStyle}>{t('settings.remindersHeading')}</h2>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-body)', marginBottom: '16px' }}>
            <input
              type="checkbox"
              checked={remindersEnabled}
              onChange={(e) => setRemindersEnabled(e.target.checked)}
            />
            {t('settings.remindersEnabled')}
          </label>

          <label style={{ fontSize: '13px', color: 'var(--text-body)', display: 'block', marginBottom: '6px' }}>
            {t('settings.reminderDays')}
          </label>
          <input
            type="number"
            min={1}
            max={30}
            value={reminderDays}
            disabled={!remindersEnabled}
            onChange={(e) => setReminderDays(Number(e.target.value))}
            className="field-input"
            style={{ maxWidth: '120px' }}
          />
          <p style={{ ...helpStyle, marginTop: '8px', marginBottom: 0 }}>{t('settings.reminderDaysHelp')}</p>
        </div>

        {/* New application defaults */}
        <div className="card" style={cardStyle}>
          <h2 style={headingStyle}>{t('settings.newApplicationsHeading')}</h2>
          <label style={{ fontSize: '13px', color: 'var(--text-body)', display: 'block', marginBottom: '6px' }}>
            {t('settings.defaultStatus')}
          </label>
          <select
            value={defaultStatus}
            onChange={(e) => setDefaultStatus(e.target.value)}
            className="field-input"
            style={{ maxWidth: '200px' }}
          >
            {STATUSES.map(status => (
              <option key={status} value={status}>{t(`status.${status}`)}</option>
            ))}
          </select>
          <p style={{ ...helpStyle, marginTop: '8px', marginBottom: 0 }}>{t('settings.defaultStatusHelp')}</p>
        </div>

        {/* Language */}
        <div className="card" style={cardStyle}>
          <h2 style={headingStyle}>{t('settings.languageHeading')}</h2>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="field-input"
            style={{ maxWidth: '200px' }}
          >
            {LANGUAGES.map(code => (
              <option key={code} value={code}>{LANGUAGE_NAMES[code]}</option>
            ))}
          </select>
          <p style={{ ...helpStyle, marginTop: '8px', marginBottom: 0 }}>{t('settings.languageHelp')}</p>
        </div>

        {/* Appearance */}
        <div className="card" style={cardStyle}>
          <h2 style={headingStyle}>{t('settings.appearanceHeading')}</h2>
          <p style={helpStyle}>{t('settings.appearanceHelp')}</p>

          <label style={{ fontSize: '13px', color: 'var(--text-body)', display: 'block', marginBottom: '8px' }}>
            {t('settings.themeMode')}
          </label>
          <div role="radiogroup" aria-label={t('settings.themeMode')} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
            {THEME_MODES.map(value => {
              const Icon = MODE_ICONS[value]
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={mode === value}
                  onClick={() => setMode(value)}
                  className={`btn btn-sm ${mode === value ? 'btn-accent' : 'btn-secondary'}`}
                >
                  <Icon size={14} />
                  {t(`settings.mode.${value}`)}
                </button>
              )
            })}
          </div>

          <label style={{ fontSize: '13px', color: 'var(--text-body)', display: 'block', marginBottom: '8px' }}>
            {t('settings.accent')}
          </label>
          <div role="radiogroup" aria-label={t('settings.accent')} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', padding: '2px' }}>
            {ACCENTS.map(value => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={accent === value}
                aria-label={t(`settings.accent.${value}`)}
                title={t(`settings.accent.${value}`)}
                onClick={() => setAccent(value)}
                className="swatch"
                style={{ background: ACCENT_SWATCHES[value] }}
              >
                {accent === value && <CheckIcon size={15} strokeWidth={3} />}
              </button>
            ))}
          </div>
        </div>

        {error && <p style={{ color: 'var(--danger)', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}
        {message && <p style={{ color: 'var(--success)', fontSize: '13px', marginBottom: '12px' }}>{message}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary"
          style={{ marginBottom: '32px' }}
        >
          {saving && <span className="spinner" />}
          {saving ? t('settings.saving') : t('settings.save')}
        </button>

        {/* Account */}
        <div className="card" style={cardStyle}>
          <h2 style={headingStyle}>{t('settings.accountHeading')}</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            {t('settings.signedInAs')} <strong style={{ color: 'var(--text-body)' }}>{email}</strong>
          </p>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <a href="/forgot-password" className="link-accent" style={{ fontSize: '14px' }}>
              {t('settings.changePassword')}
            </a>
            <button
              onClick={handleSignOut}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <LogOutIcon size={14} />
              {t('settings.signOut')}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
