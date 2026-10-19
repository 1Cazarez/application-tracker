'use client'

import { useLanguage } from '@/lib/language'

export function LoadingScreen() {
  const { t } = useLanguage()
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Stays invisible for the first 300ms, so fast loads don't flash it. */}
      <div role="status" className="crest-loader">
        <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
          <path d="M20 4 L37 33 L3 33 Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
        <span className="crest-dot" />
        <span className="crest-dot" />
        <span className="crest-dot" />
        <span className="visually-hidden">{t('common.loading')}</span>
      </div>
    </div>
  )
}
