'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/lib/language'

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

  const inputStyle = {
    width: '100%',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    padding: '10px 12px',
    fontSize: '14px',
    boxSizing: 'border-box' as const,
  }

  const labelStyle = {
    fontSize: '13px',
    color: '#374151',
    display: 'block',
    marginBottom: '6px',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '40px', width: '100%', maxWidth: '400px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>{t('reset.title')}</h1>
        <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '24px' }}>
          {t('reset.subtitle')}
        </p>

        {done ? (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '16px' }}>
            <p style={{ color: '#16a34a', fontSize: '14px', margin: 0 }}>
              {t('reset.done')}
            </p>
          </div>
        ) : !ready ? (
          <div style={{ background: '#fefce8', border: '1px solid #fde68a', borderRadius: '8px', padding: '16px' }}>
            <p style={{ color: '#92400e', fontSize: '14px', margin: 0 }}>
              {t('reset.invalidLink')}{' '}
              <a href="/forgot-password" style={{ color: '#92400e', fontWeight: '600' }}>{t('reset.requestNew')}</a>
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
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>{t('reset.confirmNewPassword')}</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  ...inputStyle,
                  borderColor: confirmPassword && password !== confirmPassword ? '#dc2626' : '#d1d5db',
                }}
              />
              {confirmPassword && password !== confirmPassword && (
                <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>{t('login.passwordsDoNotMatch')}</p>
              )}
            </div>

            {error && <p style={{ color: '#dc2626', fontSize: '13px', marginBottom: '16px' }}>{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{ width: '100%', background: '#111827', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', opacity: loading ? 0.5 : 1 }}
            >
              {loading ? t('reset.updating') : t('reset.update')}
            </button>
          </>
        )}

        <p style={{ textAlign: 'center', fontSize: '13px', color: '#6b7280', marginTop: '16px' }}>
          <a href="/login" style={{ color: '#111827', fontWeight: '600', textDecoration: 'none' }}>{t('common.backToSignIn')}</a>
        </p>
      </div>
    </div>
  )
}
