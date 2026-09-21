'use client'

import { useState } from 'react'
import { getCompanyLogoUrl } from '@/lib/companyLogo'
import { BuildingIcon } from '@/lib/icons'

export function CompanyLogo({ company, url, size = 40 }: { company: string; url?: string | null; size?: number }) {
  const src = getCompanyLogoUrl(company, url)
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return (
      <div style={{
        width: size, height: size, borderRadius: '10px', background: 'var(--accent-soft)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', flexShrink: 0,
      }}>
        <BuildingIcon size={size * 0.5} strokeWidth={2} />
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      onError={() => setFailed(true)}
      style={{
        width: size, height: size, borderRadius: '10px', objectFit: 'contain',
        background: '#fff', border: '1px solid var(--border)', flexShrink: 0, padding: size * 0.16,
      }}
    />
  )
}
