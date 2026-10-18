import { BriefcaseIcon } from '@/lib/icons'

/** The branded, centered card shared by the signed-out pages. */
export function AuthCard({ title, subtitle, children }: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
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
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>{title}</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>{subtitle}</p>
        {children}
      </div>
    </div>
  )
}
