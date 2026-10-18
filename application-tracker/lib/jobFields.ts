export const STATUSES = ['applied', 'interview', 'offer', 'rejected'] as const
export type Status = (typeof STATUSES)[number]

// The editable details of an application, in form order.
export const JOB_FIELDS = ['company', 'title', 'date_applied', 'deadline', 'pay', 'location', 'url', 'job_type'] as const
export type JobField = (typeof JOB_FIELDS)[number]
export type JobFieldValues = Record<JobField, string>

export const EMPTY_JOB = Object.fromEntries(JOB_FIELDS.map(field => [field, ''])) as JobFieldValues

export const DATE_FIELDS: ReadonlySet<JobField> = new Set(['deadline', 'date_applied'])

// Company and title are required on save; every other field may be blank.
export type Job = Record<Exclude<JobField, 'company' | 'title'>, string | null> & {
  company: string
  title: string
  id: string
  user_id: string | null
  status: Status
  notes: string | null
  reminder_sent: boolean
  created_at: string
}

/**
 * Picks the job fields out of a row or a model response, as strings. Missing,
 * null, and non-string values become '' so they can back a controlled input.
 */
export function toJobFieldValues(source: unknown, fields: readonly JobField[] = JOB_FIELDS): JobFieldValues {
  const record = (source ?? {}) as Record<string, unknown>
  const values = { ...EMPTY_JOB }
  for (const field of fields) {
    const value = record[field]
    if (typeof value === 'string') values[field] = value
  }
  return values
}

// Blank fields must go in as null, not '' — deadline and date_applied are date
// columns and Postgres rejects the empty string.
export function blankToNull(values: JobFieldValues) {
  return Object.fromEntries(
    JOB_FIELDS.map(field => [field, values[field].trim() === '' ? null : values[field]])
  ) as Record<JobField, string | null>
}
