'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function UploadPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [extracted, setExtracted] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setExtracted(null)
  }

  const handleExtract = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('screenshot', file)

      const res = await fetch('/api/extract', {
        method: 'POST',
        body: formData
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setExtracted(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!extracted) return
    setLoading(true)
    try {
      const { error } = await supabase.from('jobs').insert([{
        ...extracted,
        status: 'applied',
      }])
      if (error) throw error
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <main style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', marginBottom: '24px' }}>Add a job application</h1>

        <input
          type="file"
          accept="image/*"
          onChange={handleFile}
          style={{ marginBottom: '16px', display: 'block' }}
        />

        {preview && (
          <img src={preview} alt="Screenshot preview" style={{ width: '100%', borderRadius: '8px', marginBottom: '16px' }} />
        )}

        {file && !extracted && (
          <button
            onClick={handleExtract}
            disabled={loading}
            style={{ width: '100%', padding: '10px', background: '#111827', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', marginBottom: '16px', opacity: loading ? 0.5 : 1, fontSize: '14px', fontWeight: '600' }}
          >
            {loading ? 'Extracting...' : 'Extract job details'}
          </button>
        )}

        {error && (
          <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
            <p style={{ color: '#dc2626', fontSize: '13px', margin: 0 }}>{error}</p>
            {error.includes('API key') && (
              <a href="/settings" style={{ color: '#dc2626', fontSize: '13px', fontWeight: '600' }}>Go to Settings →</a>
            )}
          </div>
        )}

        {extracted && (
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
            <h2 style={{ fontWeight: '600', marginBottom: '16px', color: '#111827' }}>Confirm details</h2>
            {Object.entries(extracted).map(([key, value]) => (
              <div key={key} style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', color: '#6b7280', textTransform: 'capitalize', display: 'block', marginBottom: '4px' }}>{key.replace('_', ' ')}</label>
                <input
                  style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '6px', padding: '8px 10px', fontSize: '14px', boxSizing: 'border-box' }}
                  value={value as string}
                  onChange={(e) => setExtracted({ ...extracted, [key]: e.target.value })}
                />
              </div>
            ))}
            <button
              onClick={handleSave}
              disabled={loading}
              style={{ width: '100%', padding: '10px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', marginTop: '8px', fontSize: '14px', fontWeight: '600', opacity: loading ? 0.5 : 1 }}
            >
              {loading ? 'Saving...' : 'Save to tracker'}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
