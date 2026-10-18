'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/lib/language'
import { errorMessage } from '@/lib/errors'
import { AuthCard } from '@/components/AuthCard'

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
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard title={t('forgot.title')} subtitle={t('forgot.subtitle')}>
      {sent ? (
        <div style={{ background: 'var(--success-soft)', border: '1px solid var(--success-border)', borderRadius: 'var(--radius-sm)', padding: '16px', marginBottom: '16px' }}>
          <p style={{ color: 'var(--success)', fontSize: '14px', margin: 0 }}>
            {t('forgot.sentTo', { email })}
          </p>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', color: 'var(--text-body)', display: 'block', marginBottom: '6px' }}>{t('common.email')}</label>
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
        <Link href="/login" className="link-accent">{t('common.backToSignIn')}</Link>
      </p>
    </AuthCard>
  )
}
