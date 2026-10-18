'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/lib/language'
import { errorMessage } from '@/lib/errors'
import { AuthCard } from '@/components/AuthCard'

const labelStyle = {
  fontSize: '13px',
  color: 'var(--text-body)',
  display: 'block',
  marginBottom: '6px',
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    // Supabase may have processed the recovery token before the listener attached.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async () => {
    setError(null)
    if (password !== confirmPassword) {
      setError(t('login.passwordsDoNotMatch'))
      return
    }
    if (password.length < 6) {
      setError(t('login.passwordTooShort'))
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setDone(true)
      setTimeout(() => router.push('/dashboard'), 2000)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  let content
  if (done) {
    content = (
      <div className="fade-in-up" style={{ background: 'var(--success-soft)', border: '1px solid var(--success-border)', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
        <p style={{ color: 'var(--success)', fontSize: '14px', margin: 0 }}>
          {t('reset.done')}
        </p>
      </div>
    )
  } else if (!ready) {
    content = (
      <div style={{ background: 'var(--warning-soft)', border: '1px solid var(--warning-border)', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
        <p style={{ color: 'var(--warning-text)', fontSize: '14px', margin: 0 }}>
          {t('reset.invalidLink')}{' '}
          <Link href="/forgot-password" style={{ color: 'var(--warning-text)', fontWeight: '600' }}>{t('reset.requestNew')}</Link>
        </p>
      </div>
    )
  } else {
    content = (
      <>
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>{t('reset.newPassword')}</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="field-input"
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>{t('reset.confirmNewPassword')}</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            className="field-input"
            style={{
              borderColor: confirmPassword && password !== confirmPassword ? 'var(--danger)' : undefined,
            }}
          />
          {confirmPassword && password !== confirmPassword && (
            <p style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '4px' }}>{t('login.passwordsDoNotMatch')}</p>
          )}
        </div>

        {error && <p className="fade-in-up" style={{ color: 'var(--danger)', fontSize: '13px', marginBottom: '16px' }}>{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="btn btn-primary"
          style={{ width: '100%' }}
        >
          {loading && <span className="spinner" />}
          {loading ? t('reset.updating') : t('reset.update')}
        </button>
      </>
    )
  }

  return (
    <AuthCard title={t('reset.title')} subtitle={t('reset.subtitle')}>
      {content}
      <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)', marginTop: '16px' }}>
        <Link href="/login" className="link-accent">{t('common.backToSignIn')}</Link>
      </p>
    </AuthCard>
  )
}
