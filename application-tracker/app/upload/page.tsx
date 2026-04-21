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
        status: 'applied'
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
    <main style={{ maxWidth: '600px', margin: '0 auto', padding: '24px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '24px' }}>Add a job application</h1>

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
          style={{ width: '100%', padding: '10px', background: '#000', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', marginBottom: '16px', opacity: loading ? 0.5 : 1 }}
        >
          {loading ? 'Extracting...' : 'Extract job details'}
        </button>
      )}

      {error && <p style={{ color: 'red', marginBottom: '16px' }}>{error}</p>}

      {extracted && (
        <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
          <h2 style={{ fontWeight: '600', marginBottom: '12px' }}>Confirm details</h2>
          {Object.entries(extracted).map(([key, value]) => (
            <div key={key} style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '12px', color: '#666', textTransform: 'capitalize', display: 'block' }}>{key}</label>
              <input
                style={{ width: '100%', border: '1px solid #ddd', borderRadius: '4px', padding: '6px 8px', fontSize: '14px', boxSizing: 'border-box' }}
                value={value as string}
                onChange={(e) => setExtracted({ ...extracted, [key]: e.target.value })}
              />
            </div>
          ))}
          <button
            onClick={handleSave}
            disabled={loading}
            style={{ width: '100%', padding: '10px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', marginTop: '8px', opacity: loading ? 0.5 : 1 }}
          >
            {loading ? 'Saving...' : 'Save to tracker'}
          </button>
        </div>
      )}
    </main>
  )
}