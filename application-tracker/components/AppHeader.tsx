'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLanguage } from '@/lib/language'
import { BriefcaseIcon, UserIcon } from '@/lib/icons'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'nav.dashboard' },
  { href: '/upload', label: 'nav.add' },
  { href: '/settings', label: 'nav.settings' },
] as const

export function AppHeader({ email }: { email?: string | null }) {
  const pathname = usePathname()
  const { t } = useLanguage()
  const initial = email?.trim().charAt(0).toUpperCase()

  return (
    <header style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
      <div style={{
        maxWidth: '1200px', margin: '0 auto', padding: '10px 24px', minHeight: '64px',
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 16px',
      }}>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginRight: '12px' }}>
          <span style={{
            width: 30, height: 30, borderRadius: 8, background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--on-accent)', flexShrink: 0,
          }}>
            <BriefcaseIcon size={16} strokeWidth={2.25} />
          </span>
          <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            Application Tracker
          </span>
        </Link>

        <nav aria-label={t('nav.label')} style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', flex: '1 1 auto' }}>
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="nav-link"
              aria-current={pathname === item.href ? 'page' : undefined}
            >
              {t(item.label)}
            </Link>
          ))}
        </nav>

        <Link
          href="/settings"
          aria-label={t('nav.account')}
          title={email ?? undefined}
          style={{
            width: 40, height: 40, borderRadius: '50%', background: 'var(--primary)', color: 'var(--on-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 600, flexShrink: 0,
          }}
        >
          {initial || <UserIcon size={17} />}
        </Link>
      </div>
    </header>
  )
}
