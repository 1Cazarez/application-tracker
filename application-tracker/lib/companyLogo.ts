// Best-effort company logo lookup via Google's favicon service (no API key,
// no rate limit that would affect this app). We only have a company name and
// maybe a listing URL to go on, so this is a guess, not a guarantee — the
// caller is expected to fall back to a placeholder if the image 404s.

const JOB_BOARD_HOSTS = new Set([
  'linkedin.com', 'indeed.com', 'glassdoor.com', 'ziprecruiter.com',
  'monster.com', 'ashbyhq.com', 'greenhouse.io', 'boards.greenhouse.io',
  'job-boards.greenhouse.io', 'lever.co', 'jobs.lever.co', 'myworkdayjobs.com',
  'wellfound.com', 'angel.co', 'dice.com', 'simplyhired.com', 'careerbuilder.com',
  'smartrecruiters.com', 'icims.com', 'workable.com', 'apply.workable.com',
  'bamboohr.com', 'jobvite.com', 'breezy.hr', 'recruitee.com', 'paylocity.com',
  'teamtailor.com', 'personio.com',
])

const COMPANY_SUFFIXES = /\b(inc|llc|ltd|corp|corporation|co|company|group|holdings|plc|gmbh|srl|sa|ag)\b\.?/gi

function hostFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

function domainFromCompanyName(company: string): string | null {
  const cleaned = company
    .toLowerCase()
    .replace(COMPANY_SUFFIXES, '')
    .replace(/[^a-z0-9]/g, '')
    .trim()
  return cleaned ? `${cleaned}.com` : null
}

export function getCompanyLogoUrl(company: string, jobUrl?: string | null): string | null {
  let domain: string | null = null

  if (jobUrl) {
    const host = hostFromUrl(jobUrl)
    if (host && !JOB_BOARD_HOSTS.has(host)) domain = host
  }

  if (!domain && company?.trim()) domain = domainFromCompanyName(company)
  if (!domain) return null

  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`
}
