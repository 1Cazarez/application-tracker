'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { SignOutButton, UserButton } from '@clerk/nextjs'

const STATUS_STYLES: Record<string, { background: string; color: string; label: string }> = {
  applied:   { background: '#dbeafe', color: '#1d4ed8', label: 'Applied' },
  interview: { background: '#fef3c7', color: '#d97706', label: 'Interview' },
  offer:     { background: '#dcfce7', color: '#15803d', label: 'Offer' },
  rejected:  { background: '#fee2e2', color: '#dc2626', label: 'Rejected' },
}

export default function Dashboard() {
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchJobs()
  }, [])

  const fetchJobs = async () => {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) setJobs(data)
    setLoading(false)
  }

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('jobs').update({ status }).eq('id', id)
    setJobs(jobs.map(j => j.id === id ? { ...j, status } : j))
  }

  const deleteJob = async (id: string) => {
    await supabase.from('jobs').delete().eq('id', id)
    setJobs(jobs.filter(j => j.id !== id))
  }

  const getDaysUntil = (deadline: string) => {
    if (!deadline) return null
    return Math.ceil((new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#6b7280' }}>Loading...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#111827', margin: 0 }}>My applications</h1>
            <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>{jobs.length} total</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Link href="/upload" style={{
              background: '#111827', color: '#fff', padding: '10px 20px',
              borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: '500'
            }}>
              + Add application
            </Link>
            <UserButton />
            <Link href="/settings" style={{ fontSize: '14px', color: '#6b7280', textDecoration: 'none' }}>
              Settings
            </Link>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '32px' }}>
          {Object.entries(STATUS_STYLES).map(([status, style]) => (
            <div key={status} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
              <p style={{ fontSize: '24px', fontWeight: '700', color: style.color, margin: 0 }}>
                {jobs.filter(j => j.status === status).length}
              </p>
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{style.label}</p>
            </div>
          ))}
        </div>

        {/* Job cards */}
        {jobs.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '48px', textAlign: 'center' }}>
            <p style={{ color: '#6b7280', fontSize: '16px' }}>No applications yet.</p>
            <Link href="/upload" style={{ color: '#111827', fontWeight: '600', fontSize: '14px' }}>Add your first one →</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {jobs.map(job => {
              const days = getDaysUntil(job.deadline)
              const status = STATUS_STYLES[job.status] || STATUS_STYLES.applied
              const urgent = days !== null && days <= 3
              return (
                <div key={job.id} style={{
                  background: '#fff', border: '1px solid #e5e7eb',
                  borderRadius: '12px', padding: '20px',
                  borderLeft: `4px solid ${status.color}`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: '0 0 4px' }}>{job.title}</h2>
                      <p style={{ fontSize: '14px', color: '#374151', margin: '0 0 8px', fontWeight: '500' }}>{job.company}</p>
                      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                        {job.pay && <span style={{ fontSize: '13px', color: '#6b7280' }}>💰 {job.pay}</span>}
                        {job.location && <span style={{ fontSize: '13px', color: '#6b7280' }}>📍 {job.location}</span>}
                        {job.job_type && <span style={{ fontSize: '13px', color: '#6b7280' }}>💼 {job.job_type}</span>}
                        {job.deadline && (
                          <span style={{ fontSize: '13px', color: urgent ? '#dc2626' : '#6b7280', fontWeight: urgent ? '600' : '400' }}>
                            {urgent ? '⚠️' : '📅'} {job.deadline} ({days} days)
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', marginLeft: '16px' }}>
                      <select
                        value={job.status}
                        onChange={(e) => updateStatus(job.id, e.target.value)}
                        style={{
                          background: status.background, color: status.color,
                          border: 'none', borderRadius: '20px', padding: '4px 10px',
                          fontSize: '12px', fontWeight: '600', cursor: 'pointer', outline: 'none'
                        }}
                      >
                        <option value="applied">Applied</option>
                        <option value="interview">Interview</option>
                        <option value="offer">Offer</option>
                        <option value="rejected">Rejected</option>
                      </select>
                      {job.url && (
                        <a href={job.url} target="_blank" style={{ fontSize: '12px', color: '#3b82f6', textDecoration: 'none' }}>
                          View listing ↗
                        </a>
                      )}
                      <button
                        onClick={() => deleteJob(job.id)}
                        style={{ fontSize: '12px', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  {job.notes && <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f3f4f6' }}>{job.notes}</p>}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}