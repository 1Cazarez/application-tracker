'use client'

import { useLanguage } from '@/lib/language'
import { DATE_FIELDS, JOB_FIELDS, JobField, JobFieldValues } from '@/lib/jobFields'
import {
  BuildingIcon, BriefcaseIcon, CalendarIcon, CalendarCheckIcon, DollarSignIcon,
  MapPinIcon, LinkIcon, TagIcon,
} from '@/lib/icons'

const FIELD_ICONS: Record<JobField, typeof BuildingIcon> = {
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
  values: JobFieldValues
  onChange: (values: JobFieldValues) => void
}) {
  const { t } = useLanguage()

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
      {JOB_FIELDS.map(field => {
        const Icon = FIELD_ICONS[field]
        return (
          <div key={field} style={{ gridColumn: field === 'url' ? '1 / -1' : undefined }}>
            <label
              htmlFor={`job-field-${field}`}
              style={{
                fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)',
                display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px',
              }}
            >
              <Icon size={13} strokeWidth={2.25} style={{ color: 'var(--text-tertiary)' }} />
              {t(`field.${field}`)}
            </label>
            <input
              id={`job-field-${field}`}
              type={DATE_FIELDS.has(field) ? 'date' : 'text'}
              className="field-input"
              value={values[field]}
              onChange={(e) => onChange({ ...values, [field]: e.target.value })}
            />
          </div>
        )
      })}
    </div>
  )
}
