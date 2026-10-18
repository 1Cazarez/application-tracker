'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/lib/language'
import { Account, useAccount } from '@/lib/account'
import { errorMessage } from '@/lib/errors'
import { LANGUAGES, LANGUAGE_NAMES, Language } from '@/lib/i18n'
import { STATUSES, Status } from '@/lib/jobFields'
import { useTheme } from '@/lib/theme'
import { ACCENTS, ACCENT_SWATCHES, THEME_MODES, ThemeMode } from '@/lib/theme-config'
import { AppHeader } from '@/components/AppHeader'
import { LoadingScreen } from '@/components/LoadingScreen'
import {
  LogOutIcon, CheckIcon, SparklesIcon, BellIcon, BriefcaseIcon, GlobeIcon, UserIcon, MinusIcon, PlusIcon,
} from '@/lib/icons'

const MIN_REMINDER_DAYS = 1
const MAX_REMINDER_DAYS = 30

const clampDays = (days: number) =>
  Math.min(MAX_REMINDER_DAYS, Math.max(MIN_REMINDER_DAYS, Math.round(days) || MIN_REMINDER_DAYS))

const SECTIONS = [
  { id: 'screenshots', label: 'settings.nav.screenshots', Icon: SparklesIcon },
  { id: 'reminders', label: 'settings.nav.reminders', Icon: BellIcon },
  { id: 'new-applications', label: 'settings.nav.newApplications', Icon: BriefcaseIcon },
  { id: 'appearance', label: 'settings.nav.appearance', Icon: GlobeIcon },
  { id: 'account', label: 'settings.nav.account', Icon: UserIcon },
] as const

// Small sketches of each theme. They show the theme itself, so they use its
// fixed colors rather than the current palette's variables.
const THEME_PREVIEWS: Record<Exclude<ThemeMode, 'system'>, { bg: string; surface: string; line: string; border: string }> = {
  light: { bg: '#f6f7f9', surface: '#ffffff', line: '#d1d5db', border: '#e5e7eb' },
  dark: { bg: '#0b0f17', surface: '#131a26', line: '#33425c', border: '#243044' },
}

function ThemeSketch({ theme }: { theme: Exclude<ThemeMode, 'system'> }) {
  const colors = THEME_PREVIEWS[theme]
  return (
    <span style={{ flex: 1, background: colors.bg, padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <span style={{ height: 8, width: '55%', borderRadius: 3, background: colors.line }} />
      <span style={{ height: 22, borderRadius: 5, background: colors.surface, border: `1px solid ${colors.border}` }} />
    </span>
  )
}

const sectionHeaderStyle: React.CSSProperties = { padding: '20px 24px', borderBottom: '1px solid var(--border)' }
const rowStyle: React.CSSProperties = { padding: '20px 24px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px 32px' }
const rowTextStyle: React.CSSProperties = { flex: '1 1 220px' }
const titleStyle: React.CSSProperties = { fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }
const helpStyle: React.CSSProperties = { fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.5 }
const dividerStyle: React.CSSProperties = { borderTop: '1px solid var(--border)' }

export default function SettingsPage() {
  const account = useAccount()
  if (!account) return <LoadingScreen />
  return <SettingsForm account={account} />
}

type SavedSettings = {
  geminiKey: string
  remindersEnabled: boolean
  reminderDays: number
  defaultStatus: Status
  language: Language
}

function SettingsForm({ account }: { account: Account }) {
  const router = useRouter()
  const { t, language, setLanguage } = useLanguage()
  const { mode, accent, setMode, setAccent } = useTheme()
  const { user, settings } = account

  // What's stored on the account, to tell whether the form has unsaved edits.
  const [saved, setSaved] = useState<SavedSettings>(() => ({
    geminiKey: settings?.gemini_api_key ?? '',
    remindersEnabled: settings?.reminders_enabled ?? true,
    reminderDays: settings?.reminder_days ?? 7,
    defaultStatus: settings?.default_status ?? 'applied',
    language,
  }))
  const [geminiKey, setGeminiKey] = useState(saved.geminiKey)
  const [showKey, setShowKey] = useState(false)
  const [remindersEnabled, setRemindersEnabled] = useState(saved.remindersEnabled)
  const [reminderDays, setReminderDays] = useState(saved.reminderDays)
  const [defaultStatus, setDefaultStatus] = useState<Status>(saved.defaultStatus)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dirty =
    geminiKey.trim() !== saved.geminiKey ||
    remindersEnabled !== saved.remindersEnabled ||
    reminderDays !== saved.reminderDays ||
    defaultStatus !== saved.defaultStatus ||
    language !== saved.language

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    const next: SavedSettings = {
      geminiKey: geminiKey.trim(),
      remindersEnabled,
      reminderDays: clampDays(reminderDays),
      defaultStatus,
      language,
    }
    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          gemini_api_key: next.geminiKey || null,
          reminders_enabled: next.remindersEnabled,
          reminder_days: next.reminderDays,
          default_status: next.defaultStatus,
          language: next.language,
        }, { onConflict: 'user_id' })

      if (error) throw error
      setSaved(next)
      setGeminiKey(next.geminiKey)
      setReminderDays(next.reminderDays)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleDiscard = () => {
    setGeminiKey(saved.geminiKey)
    setRemindersEnabled(saved.remindersEnabled)
    setReminderDays(saved.reminderDays)
    setDefaultStatus(saved.defaultStatus)
    setLanguage(saved.language)
    setError(null)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <AppHeader email={user.email} />

      <main style={{ maxWidth: '1040px', margin: '0 auto', padding: '32px 24px 80px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>{t('settings.title')}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>{t('settings.subtitle')}</p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '32px', alignItems: 'flex-start' }}>

          <nav aria-label={t('settings.nav.label')} style={{ flex: '1 1 200px', maxWidth: '240px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {SECTIONS.map(({ id, label, Icon }) => (
              <a key={id} href={`#${id}`} className="side-link">
                <Icon size={16} />
                {t(label)}
              </a>
            ))}
          </nav>

          <div style={{ flex: '999 1 560px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>

            <section id="screenshots" aria-labelledby="screenshots-heading" className="card anchor-section">
              <div style={sectionHeaderStyle}>
                <h2 id="screenshots-heading" style={titleStyle}>{t('settings.screenshotsHeading')}</h2>
                <p style={helpStyle}>{t('settings.screenshotsHelp')}</p>
              </div>
              <div style={rowStyle}>
                <div style={rowTextStyle}>
                  <label htmlFor="gemini-key" style={labelStyle}>{t('settings.keyHeading')}</label>
                  <p style={helpStyle}>
                    {t('settings.keyHelp')}{' '}
                    {t('settings.keyGet')}{' '}
                    <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" className="link-accent">aistudio.google.com</a>.
                  </p>
                </div>
                <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      id="gemini-key"
                      type={showKey ? 'text' : 'password'}
                      value={geminiKey}
                      onChange={(e) => setGeminiKey(e.target.value)}
                      placeholder="AIza..."
                      autoComplete="off"
                      spellCheck={false}
                      className="field-input"
                      style={{ fontFamily: 'var(--font-geist-mono), monospace' }}
                    />
                    <button type="button" onClick={() => setShowKey(!showKey)} className="btn btn-secondary" aria-pressed={showKey}>
                      {showKey ? t('settings.hideKey') : t('settings.showKey')}
                    </button>
                  </div>
                  {saved.geminiKey && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 500, color: 'var(--success)' }}>
                      <CheckIcon size={14} strokeWidth={2.5} />
                      {t('settings.keySaved')}
                    </span>
                  )}
                </div>
              </div>
            </section>

            <section id="reminders" aria-labelledby="reminders-heading" className="card anchor-section">
              <div style={sectionHeaderStyle}>
                <h2 id="reminders-heading" style={titleStyle}>{t('settings.remindersHeading')}</h2>
                <p style={helpStyle}>{t('settings.remindersHelp')}</p>
              </div>
              <div style={rowStyle}>
                <div style={rowTextStyle}>
                  <span id="reminders-label" style={labelStyle}>{t('settings.remindersEnabled')}</span>
                  <p style={helpStyle}>{t('settings.remindersEnabledHelp')}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={remindersEnabled}
                  aria-labelledby="reminders-label"
                  onClick={() => setRemindersEnabled(!remindersEnabled)}
                  className="switch"
                >
                  <span className="switch-thumb" />
                </button>
              </div>
              <div style={{ ...rowStyle, ...dividerStyle, opacity: remindersEnabled ? 1 : 0.55 }}>
                <div style={rowTextStyle}>
                  <label htmlFor="reminder-days" style={labelStyle}>{t('settings.reminderDays')}</label>
                  <p style={helpStyle}>{t('settings.reminderDaysHelp')}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', overflow: 'hidden', flexShrink: 0 }}>
                  <button
                    type="button"
                    className="icon-btn"
                    style={{ width: 44, height: 44, borderRadius: 0 }}
                    aria-label={t('settings.fewerDays')}
                    disabled={!remindersEnabled || reminderDays <= MIN_REMINDER_DAYS}
                    onClick={() => setReminderDays(clampDays(reminderDays - 1))}
                  >
                    <MinusIcon size={16} />
                  </button>
                  <input
                    id="reminder-days"
                    type="number"
                    min={MIN_REMINDER_DAYS}
                    max={MAX_REMINDER_DAYS}
                    value={reminderDays}
                    disabled={!remindersEnabled}
                    onChange={(e) => setReminderDays(Number(e.target.value))}
                    onBlur={() => setReminderDays(clampDays(reminderDays))}
                    style={{
                      width: 56, height: 44, border: 'none', borderLeft: '1px solid var(--border)', borderRight: '1px solid var(--border)',
                      textAlign: 'center', fontSize: '14px', fontWeight: 600, fontFamily: 'var(--font-geist-mono), monospace',
                      color: 'var(--text-primary)', background: 'var(--surface)',
                    }}
                  />
                  <button
                    type="button"
                    className="icon-btn"
                    style={{ width: 44, height: 44, borderRadius: 0 }}
                    aria-label={t('settings.moreDays')}
                    disabled={!remindersEnabled || reminderDays >= MAX_REMINDER_DAYS}
                    onClick={() => setReminderDays(clampDays(reminderDays + 1))}
                  >
                    <PlusIcon size={16} />
                  </button>
                </div>
              </div>
            </section>

            <section id="new-applications" aria-labelledby="new-applications-heading" className="card anchor-section">
              <div style={sectionHeaderStyle}>
                <h2 id="new-applications-heading" style={titleStyle}>{t('settings.newApplicationsHeading')}</h2>
              </div>
              <div style={rowStyle}>
                <div style={rowTextStyle}>
                  <span id="status-label" style={labelStyle}>{t('settings.defaultStatus')}</span>
                  <p style={helpStyle}>{t('settings.defaultStatusHelp')}</p>
                </div>
                <div role="radiogroup" aria-labelledby="status-label" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {STATUSES.map(status => {
                    const selected = defaultStatus === status
                    return (
                      <button
                        key={status}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setDefaultStatus(status)}
                        className="chip status-color"
                        style={{
                          minHeight: 40, padding: '0 14px', fontSize: '14px',
                          ...(selected
                            ? { background: `var(--status-${status}-bg)`, color: `var(--status-${status}-fg)`, borderColor: `var(--status-${status}-fg)`, fontWeight: 600 }
                            : null),
                        }}
                      >
                        <span className="dot" style={{ color: `var(--status-${status}-fg)` }} />
                        {t(`status.${status}`)}
                      </button>
                    )
                  })}
                </div>
              </div>
            </section>

            <section id="appearance" aria-labelledby="appearance-heading" className="card anchor-section">
              <div style={sectionHeaderStyle}>
                <h2 id="appearance-heading" style={titleStyle}>{t('settings.languageAppearanceHeading')}</h2>
                <p style={helpStyle}>{t('settings.appearanceHelp')}</p>
              </div>
              <div style={rowStyle}>
                <div style={rowTextStyle}>
                  <span id="language-label" style={labelStyle}>{t('settings.languageHeading')}</span>
                  <p style={helpStyle}>{t('settings.languageHelp')}</p>
                </div>
                <div role="radiogroup" aria-labelledby="language-label" className="segmented">
                  {LANGUAGES.map(code => (
                    <button
                      key={code}
                      type="button"
                      role="radio"
                      aria-checked={language === code}
                      lang={code}
                      onClick={() => setLanguage(code)}
                    >
                      {LANGUAGE_NAMES[code]}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ ...rowStyle, ...dividerStyle, flexDirection: 'column', alignItems: 'stretch', gap: '14px' }}>
                <span id="theme-label" style={labelStyle}>{t('settings.themeMode')}</span>
                <div role="radiogroup" aria-labelledby="theme-label" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                  {THEME_MODES.map(value => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={mode === value}
                      onClick={() => setMode(value)}
                      className="theme-tile"
                    >
                      <span aria-hidden="true" style={{ display: 'flex', height: 76, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
                        {value === 'system'
                          ? <><ThemeSketch theme="light" /><ThemeSketch theme="dark" /></>
                          : <ThemeSketch theme={value} />}
                      </span>
                      <span style={{ padding: '0 4px 2px' }}>{t(`settings.mode.${value}`)}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ ...rowStyle, ...dividerStyle }}>
                <div style={rowTextStyle}>
                  <span id="accent-label" style={labelStyle}>{t('settings.accent')}</span>
                  <p style={helpStyle}>{t('settings.accentHelp')}</p>
                </div>
                <div role="radiogroup" aria-labelledby="accent-label" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', padding: '2px' }}>
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
                      {accent === value && <CheckIcon size={16} strokeWidth={3} />}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <div
              role="region"
              aria-label={t('settings.saveBar')}
              style={{
                position: 'sticky', bottom: '16px', zIndex: 1,
                display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: '12px 16px',
                padding: '12px 14px 12px 20px', borderRadius: 'var(--radius-lg)',
                background: 'var(--primary)', color: 'var(--on-primary)', boxShadow: 'var(--shadow-lg)',
              }}
            >
              <span aria-live="polite" style={{ marginRight: 'auto', display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                <span className="dot" style={{ width: 8, height: 8, color: error ? 'var(--danger)' : dirty ? 'var(--warning)' : 'var(--success)' }} />
                {error ?? (dirty ? t('settings.unsaved') : t('settings.saved'))}
              </span>
              <button
                type="button"
                onClick={handleDiscard}
                disabled={!dirty || saving}
                className="btn"
                style={{ background: 'transparent', color: 'inherit', borderColor: 'color-mix(in srgb, currentColor 30%, transparent)' }}
              >
                {t('settings.discard')}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!dirty || saving}
                className="btn"
                style={{ background: 'var(--on-primary)', color: 'var(--primary)' }}
              >
                {saving && <span className="spinner" />}
                {saving ? t('settings.saving') : t('settings.save')}
              </button>
            </div>

            <section id="account" aria-labelledby="account-heading" className="card anchor-section">
              <div style={sectionHeaderStyle}>
                <h2 id="account-heading" style={titleStyle}>{t('settings.accountHeading')}</h2>
              </div>
              <div style={{ ...rowStyle, gap: '16px' }}>
                <span aria-hidden="true" style={{
                  width: 48, height: 48, borderRadius: '50%', background: 'var(--primary)', color: 'var(--on-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px', fontWeight: 600, flexShrink: 0,
                }}>
                  {user.email?.charAt(0).toUpperCase() || <UserIcon size={20} />}
                </span>
                <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{t('settings.signedInAs')}</p>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', overflowWrap: 'anywhere' }}>{user.email}</p>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  <Link href="/forgot-password" className="btn btn-secondary">{t('settings.changePassword')}</Link>
                  <button type="button" onClick={handleSignOut} className="btn btn-danger-soft">
                    <LogOutIcon size={15} />
                    {t('settings.signOut')}
                  </button>
                </div>
              </div>
            </section>

          </div>
        </div>
      </main>
    </div>
  )
}
