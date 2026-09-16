'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/lib/language'
import { BriefcaseIcon } from '@/lib/icons'

export default function ForgotPasswordPage() {
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const handleSubmit = async () => {
    setError(null)
    if (!email) {
      setError(t('forgot.enterEmail'))
      return
    }
    setLoading(true)
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000/'
      const redirectTo = `${appUrl.replace(/\/$/, '')}/reset-password`
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
      if (error) throw error
      setSent(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
        <span style={{
          width: '34px', height: '34px', borderRadius: '10px', background: 'var(--text-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0,
        }}>
          <BriefcaseIcon size={17} strokeWidth={2.25} />
        </span>
        <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          Application Tracker
        </span>
      </div>

      <div className="card fade-in-up" style={{ padding: '40px', width: '100%', maxWidth: '400px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>{t('forgot.title')}</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
          {t('forgot.subtitle')}
        </p>

        {sent ? (
          <div style={{ background: 'var(--success-soft)', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-sm)', padding: '16px', marginBottom: '16px' }}>
            <p style={{ color: 'var(--success)', fontSize: '14px', margin: 0 }}>
              {t('forgot.sentTo', { email })}
            </p>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', color: '#374151', display: 'block', marginBottom: '6px' }}>{t('common.email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="field-input"
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              />
            </div>

            {error && <p style={{ color: 'var(--danger)', fontSize: '13px', marginBottom: '16px' }}>{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              {loading && <span className="spinner" />}
              {loading ? t('forgot.sending') : t('forgot.send')}
            </button>
          </>
        )}

        <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)', marginTop: '16px' }}>
          <a href="/login" className="link-accent">{t('common.backToSignIn')}</a>
        </p>
      </div>
    </div>
  )
}
