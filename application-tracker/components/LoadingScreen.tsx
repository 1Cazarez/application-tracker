'use client'

import { useLanguage } from '@/lib/language'

export function LoadingScreen() {
  const { t } = useLanguage()
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{t('common.loading')}</p>
    </div>
  )
}
