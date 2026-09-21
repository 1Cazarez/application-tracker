export const EMPTY_JOB = {
  company: '',
  title: '',
  date_applied: '',
  deadline: '',
  pay: '',
  location: '',
  url: '',
  job_type: '',
}

export const DATE_FIELDS = new Set(['deadline', 'date_applied'])

// Blank fields must go in as null, not '' — deadline and date_applied are date
// columns and Postgres rejects the empty string.
export function blankToNull(values: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) =>
      [key, typeof value === 'string' && value.trim() === '' ? null : value]
    )
  )
}
