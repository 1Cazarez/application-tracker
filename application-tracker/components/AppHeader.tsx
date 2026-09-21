import Link from 'next/link'
import { BriefcaseIcon } from '@/lib/icons'

export function AppHeader({ right, maxWidth = '880px' }: { right?: React.ReactNode; maxWidth?: string }) {
  return (
    <header style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
      <div style={{
        maxWidth, margin: '0 auto', padding: '16px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
      }}>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            width: 32, height: 32, borderRadius: 9, background: 'var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--on-primary)', flexShrink: 0,
          }}>
            <BriefcaseIcon size={16} strokeWidth={2.25} />
          </span>
          <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            Application Tracker
          </span>
        </Link>
        {right && <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>{right}</div>}
      </div>
    </header>
  )
}
