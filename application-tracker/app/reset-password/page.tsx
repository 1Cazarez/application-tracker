'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/lib/language'
import { BriefcaseIcon } from '@/lib/icons'

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
    // Check if Supabase already processed the recovery token before our listener attached
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setReady(true)
      }
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
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const labelStyle = {
    fontSize: '13px',
    color: 'var(--text-body)',
    display: 'block',
    marginBottom: '6px',
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
        <span style={{
          width: '34px', height: '34px', borderRadius: '10px', background: 'var(--primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--on-primary)', flexShrink: 0,
        }}>
          <BriefcaseIcon size={17} strokeWidth={2.25} />
        </span>
        <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          Application Tracker
        </span>
      </div>

      <div className="card fade-in-up" style={{ padding: '40px', width: '100%', maxWidth: '400px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>{t('reset.title')}</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
          {t('reset.subtitle')}
        </p>

        {done ? (
          <div style={{ background: 'var(--success-soft)', border: '1px solid var(--success-border)', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
            <p style={{ color: 'var(--success)', fontSize: '14px', margin: 0 }}>
              {t('reset.done')}
            </p>
          </div>
        ) : !ready ? (
          <div style={{ background: 'var(--warning-soft)', border: '1px solid var(--warning-border)', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
            <p style={{ color: 'var(--warning-text)', fontSize: '14px', margin: 0 }}>
              {t('reset.invalidLink')}{' '}
              <a href="/forgot-password" style={{ color: 'var(--warning-text)', fontWeight: '600' }}>{t('reset.requestNew')}</a>
            </p>
          </div>
        ) : (
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

            {error && <p style={{ color: 'var(--danger)', fontSize: '13px', marginBottom: '16px' }}>{error}</p>}

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
        )}

        <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)', marginTop: '16px' }}>
          <a href="/login" className="link-accent">{t('common.backToSignIn')}</a>
        </p>
      </div>
    </div>
  )
}
