'use client'

import { useLanguage } from '@/lib/language'
import { DATE_FIELDS, JOB_FIELDS, JobField, JobFieldValues } from '@/lib/jobFields'
import {
  BuildingIcon, BriefcaseIcon, CalendarIcon, CalendarCheckIcon, DollarSignIcon,
  MapPinIcon, LinkIcon, TagIcon, SparklesIcon,
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

const REQUIRED: ReadonlySet<JobField> = new Set(['company', 'title'])

// highlighted marks the fields that were filled in for the user (by Gemini or
// the paste parser), so they know which ones to double-check. hidden leaves
// fields out of the form without dropping their values.
export function JobFields({ values, onChange, highlighted, hidden }: {
  values: JobFieldValues
  onChange: (values: JobFieldValues) => void
  highlighted?: ReadonlySet<JobField>
  hidden?: ReadonlySet<JobField>
}) {
  const { t } = useLanguage()

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
      {JOB_FIELDS.filter(field => !hidden?.has(field)).map(field => {
        const Icon = FIELD_ICONS[field]
        const filled = highlighted?.has(field) ?? false
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
              {REQUIRED.has(field) && <span aria-hidden="true" style={{ color: 'var(--danger)' }}>*</span>}
              {filled && (
                <span role="img" aria-label={t('upload.filledIn')} title={t('upload.filledIn')} style={{ display: 'flex', color: 'var(--accent)' }}>
                  <SparklesIcon size={12} strokeWidth={2.25} />
                </span>
              )}
            </label>
            <input
              id={`job-field-${field}`}
              type={DATE_FIELDS.has(field) ? 'date' : 'text'}
              className="field-input"
              required={REQUIRED.has(field)}
              style={filled ? { background: 'color-mix(in srgb, var(--accent-soft) 45%, var(--surface))' } : undefined}
              value={values[field]}
              onChange={(e) => onChange({ ...values, [field]: e.target.value })}
            />
          </div>
        )
      })}
    </div>
  )
}
