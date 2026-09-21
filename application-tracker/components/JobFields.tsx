'use client'

import { useLanguage } from '@/lib/language'
import { TranslationKey } from '@/lib/i18n'
import { DATE_FIELDS } from '@/lib/jobFields'
import {
  BuildingIcon, BriefcaseIcon, CalendarIcon, CalendarCheckIcon, DollarSignIcon,
  MapPinIcon, LinkIcon, TagIcon,
} from '@/lib/icons'

const FIELD_ICONS: Record<string, typeof BuildingIcon> = {
  company: BuildingIcon,
  title: BriefcaseIcon,
  date_applied: CalendarCheckIcon,
  deadline: CalendarIcon,
  pay: DollarSignIcon,
  location: MapPinIcon,
  url: LinkIcon,
  job_type: TagIcon,
}

export function JobFields({ values, onChange }: {
  values: Record<string, string>
  onChange: (values: Record<string, string>) => void
}) {
  const { t } = useLanguage()

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
      {Object.entries(values).map(([key, value]) => {
        const Icon = FIELD_ICONS[key] ?? TagIcon
        return (
          <div key={key} style={{ gridColumn: key === 'url' ? '1 / -1' : undefined }}>
            <label
              htmlFor={`job-field-${key}`}
              style={{
                fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)',
                display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px',
              }}
            >
              <Icon size={13} strokeWidth={2.25} style={{ color: 'var(--text-tertiary)' }} />
              {t(`field.${key}` as TranslationKey)}
            </label>
            <input
              id={`job-field-${key}`}
              type={DATE_FIELDS.has(key) ? 'date' : 'text'}
              className="field-input"
              value={value}
              onChange={(e) => onChange({ ...values, [key]: e.target.value })}
            />
          </div>
        )
      })}
    </div>
  )
}
