// Best-effort field extraction from a pasted job listing. No API calls, no
// quota — this is the fallback for when a screenshot extraction isn't an
// option (missing/rate-limited Gemini key). Everything it fills in is still
// shown as editable fields, so an imperfect guess just means a quick fix
// rather than a wrong save.

export type ParsedJob = Partial<{
  company: string
  title: string
  date_applied: string
  deadline: string
  pay: string
  location: string
  url: string
  job_type: string
}>

const LABEL_PATTERNS: Array<{ field: keyof ParsedJob; pattern: RegExp }> = [
  { field: 'company', pattern: /^[ \t]*(?:company|employer|organization)[ \t]*[:\-][ \t]*(.+)$/im },
  { field: 'title', pattern: /^[ \t]*(?:job\s*title|title|role|position)[ \t]*[:\-][ \t]*(.+)$/im },
  { field: 'date_applied', pattern: /^[ \t]*(?:date\s*applied|applied\s*(?:on|date)?)[ \t]*[:\-][ \t]*(.+)$/im },
  { field: 'deadline', pattern: /^[ \t]*(?:deadline|apply\s*by|closing\s*date|closes(?:\s*on)?)[ \t]*[:\-][ \t]*(.+)$/im },
  { field: 'pay', pattern: /^[ \t]*(?:pay|salary|compensation|wage)[ \t]*[:\-][ \t]*(.+)$/im },
  { field: 'location', pattern: /^[ \t]*(?:location|based\s*in)[ \t]*[:\-][ \t]*(.+)$/im },
  { field: 'url', pattern: /^[ \t]*(?:url|link|listing|posting)[ \t]*[:\-][ \t]*(.+)$/im },
  { field: 'job_type', pattern: /^[ \t]*(?:job\s*type|employment\s*type|type)[ \t]*[:\-][ \t]*(.+)$/im },
]

const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Temporary', 'Contract-to-hire', 'Freelance', 'Seasonal']

const URL_PATTERN = /https?:\/\/[^\s)"'<>]+/
const PAY_PATTERN = /\$\s?\d[\d,]*(?:\.\d+)?\s?[kK]?(?:\s?[-–—to]{1,4}\s?\$?\s?\d[\d,]*(?:\.\d+)?\s?[kK]?)?(?:\s?\/?\s?(?:yr|year|hr|hour|mo|month|annum))?/
const STATE_LOCATION_PATTERN = /\b[A-Z][a-zA-Z.\s]{1,30},\s?[A-Z]{2}\b/
const REMOTE_PATTERN = /\bremote\b/i

function toISODate(raw: string): string | undefined {
  const trimmed = raw.trim()
  if (!trimmed) return undefined
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
  const parsed = new Date(trimmed)
  if (isNaN(parsed.getTime())) return undefined
  return parsed.toISOString().split('T')[0]
}

function extractLabeled(text: string): ParsedJob {
  const result: ParsedJob = {}
  for (const { field, pattern } of LABEL_PATTERNS) {
    const match = text.match(pattern)
    const value = match?.[1]?.trim()
    if (value) result[field] = value
  }
  return result
}

// Handles the two most common copy-paste shapes: a single "Title at Company"
// line, or a job board dump where the title is line 1 and line 2 is
// "Company · Location" (or "Company - Location").
function extractTitleAndCompany(lines: string[]): { title?: string; company?: string } {
  const first = lines[0]
  if (!first) return {}

  const atMatch = first.match(/^(.+?)\s+at\s+(.+)$/i)
  if (atMatch) return { title: atMatch[1].trim(), company: atMatch[2].trim() }

  const second = lines[1]
  if (!second) return { title: first }

  const [companyPart] = second.split(/[·|]|(?:\s-\s)/)
  return { title: first, company: (companyPart ?? second).trim() }
}

export function parsePastedJob(raw: string): ParsedJob {
  const text = raw.replace(/\r\n/g, '\n')
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  const result: ParsedJob = extractLabeled(text)

  if (!result.url) {
    const match = text.match(URL_PATTERN)
    if (match) result.url = match[0]
  }

  if (!result.pay) {
    const match = text.match(PAY_PATTERN)
    if (match) result.pay = match[0].trim()
  }

  if (!result.job_type) {
    const match = JOB_TYPES.find(type => new RegExp(`\\b${type}\\b`, 'i').test(text))
    if (match) result.job_type = match
  }

  if (!result.location) {
    if (REMOTE_PATTERN.test(text)) result.location = 'Remote'
    else {
      const match = text.match(STATE_LOCATION_PATTERN)
      if (match) result.location = match[0].trim()
    }
  }

  if (!result.title || !result.company) {
    const guessed = extractTitleAndCompany(lines)
    if (!result.title && guessed.title) result.title = guessed.title
    if (!result.company && guessed.company) result.company = guessed.company
  }

  if (result.deadline) result.deadline = toISODate(result.deadline) ?? result.deadline
  if (result.date_applied) result.date_applied = toISODate(result.date_applied) ?? result.date_applied

  return result
}
