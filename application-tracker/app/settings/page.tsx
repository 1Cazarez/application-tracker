'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function SettingsPage() {
  const router = useRouter()
  const [geminiKey, setGeminiKey] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkAuthAndLoad()
  }, [])

  const checkAuthAndLoad = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data } = await supabase
      .from('user_settings')
      .select('gemini_api_key')
      .eq('user_id', user.id)
      .single()

    if (data?.gemini_api_key) setGeminiKey(data.gemini_api_key)
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')

      const { error } = await supabase
        .from('user_settings')
        .upsert({ user_id: user.id, gemini_api_key: geminiKey })

      if (error) throw error
      setMessage('Saved successfully!')
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
      <p style={{ color: '#6b7280' }}>Loading...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 24px' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', margin: 0 }}>Settings</h1>
          <Link href="/dashboard" style={{ fontSize: '14px', color: '#6b7280', textDecoration: 'none' }}>
            ← Back to dashboard
          </Link>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>Gemini API key</h2>
          <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>
            Get your free key at{' '}
            <a href="https://aistudio.google.com" target="_blank" style={{ color: '#3b82f6' }}>aistudio.google.com</a>
            . Used to extract job details from screenshots.
          </p>
          <input
            type="password"
            value={geminiKey}
            onChange={(e) => setGeminiKey(e.target.value)}
            placeholder="AIza..."
            style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', boxSizing: 'border-box', marginBottom: '12px' }}
          />
          {error && <p style={{ color: '#dc2626', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}
          {message && <p style={{ color: '#16a34a', fontSize: '13px', marginBottom: '12px' }}>{message}</p>}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ background: '#111827', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', opacity: saving ? 0.5 : 1 }}
          >
            {saving ? 'Saving...' : 'Save key'}
          </button>
        </div>

        <button
          onClick={handleSignOut}
          style={{ color: '#dc2626', background: 'none', border: 'none', fontSize: '14px', cursor: 'pointer', padding: 0 }}
        >
          Sign out
        </button>
      </div>
    </div>
  )
}