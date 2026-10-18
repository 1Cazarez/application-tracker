'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/lib/language'
import { LANGUAGES, LANGUAGE_NAMES, TranslationKey } from '@/lib/i18n'
import { Status } from '@/lib/jobFields'
import {
  ArrowRightIcon, BellIcon, BriefcaseIcon, ChartIcon, ClipboardIcon, GlobeIcon, LockIcon, MoonIcon, SparklesIcon,
} from '@/lib/icons'

const GITHUB_URL = 'https://github.com/1Cazarez/application-tracker'

const STEPS = [
  { title: 'landing.step1Title', body: 'landing.step1Body' },
  { title: 'landing.step2Title', body: 'landing.step2Body' },
  { title: 'landing.step3Title', body: 'landing.step3Body' },
] as const

const FEATURES = [
  { Icon: BellIcon, title: 'landing.featRemindersTitle', body: 'landing.featRemindersBody' },
  { Icon: ClipboardIcon, title: 'landing.featPasteTitle', body: 'landing.featPasteBody' },
  { Icon: LockIcon, title: 'landing.featKeyTitle', body: 'landing.featKeyBody' },
  { Icon: ChartIcon, title: 'landing.featPipelineTitle', body: 'landing.featPipelineBody' },
  { Icon: GlobeIcon, title: 'landing.featLanguagesTitle', body: 'landing.featLanguagesBody' },
  { Icon: MoonIcon, title: 'landing.featThemesTitle', body: 'landing.featThemesBody' },
] as const

const FAQ: { question: TranslationKey; answer: TranslationKey }[] = [
  { question: 'landing.faqKeyQ', answer: 'landing.faqKeyA' },
  { question: 'landing.faqWrongQ', answer: 'landing.faqWrongA' },
  { question: 'landing.faqRemindersQ', answer: 'landing.faqRemindersA' },
  { question: 'landing.faqPrivacyQ', answer: 'landing.faqPrivacyA' },
]

// Sample data for the product preview. It illustrates the app, so it's the
// same in every language apart from the labels.
const PREVIEW_FIELDS = [
  { field: 'field.company', value: 'Contoso' },
  { field: 'field.title', value: 'Product Engineer' },
  { field: 'field.location', value: 'Austin, TX' },
  { field: 'field.pay', value: '$120k–$145k' },
  { field: 'field.deadline', value: '2026-10-20' },
  { field: 'field.job_type', value: 'Full-time' },
] as const

const PREVIEW_JOBS: { company: string; title: string; status: Status }[] = [
  { company: 'Contoso', title: 'Product Engineer', status: 'interview' },
  { company: 'Lumen Labs', title: 'Software Engineer II', status: 'offer' },
  { company: 'Northwind', title: 'Frontend Engineer', status: 'applied' },
  { company: 'Fabrikam', title: 'Full-Stack Developer', status: 'applied' },
]

const PREVIEW_PIPELINE: Record<Status, number> = { applied: 14, interview: 6, offer: 1, rejected: 3 }

const wrap: React.CSSProperties = { maxWidth: '1160px', margin: '0 auto', padding: '0 24px' }
const eyebrowStyle: React.CSSProperties = { color: 'var(--accent)', fontWeight: 600, fontSize: '14px', marginBottom: '8px' }
const h2Style: React.CSSProperties = {
  fontSize: 'clamp(30px, 4vw, 40px)', lineHeight: 1.1, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text-primary)',
}
const panelLabelStyle: React.CSSProperties = {
  fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em',
}
const bigButton: React.CSSProperties = { minHeight: '48px', padding: '0 22px', fontSize: '16px', borderRadius: '12px' }

export default function LandingPage() {
  const { t, language, setLanguage } = useLanguage()
  const [signedIn, setSignedIn] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)))
  }, [])

  const primaryHref = signedIn ? '/dashboard' : '/login'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: '16px', lineHeight: 1.6 }}>

      <header style={{ borderBottom: '1px solid var(--border)' }}>
        <div style={{ ...wrap, minHeight: '68px', paddingTop: '10px', paddingBottom: '10px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 24px' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginRight: 'auto', fontWeight: 600 }}>
            <span style={{
              width: 30, height: 30, borderRadius: 8, background: 'var(--accent)', color: 'var(--on-accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <BriefcaseIcon size={16} strokeWidth={2.25} />
            </span>
            Application Tracker
          </Link>
          <nav aria-label={t('nav.label')} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px 20px', fontSize: '15px' }}>
            <a href="#how" style={{ color: 'var(--text-secondary)', fontWeight: 500, padding: '10px 0' }}>{t('landing.navHow')}</a>
            <a href="#features" style={{ color: 'var(--text-secondary)', fontWeight: 500, padding: '10px 0' }}>{t('landing.navFeatures')}</a>
            <a href="#faq" style={{ color: 'var(--text-secondary)', fontWeight: 500, padding: '10px 0' }}>{t('landing.navFaq')}</a>
            {signedIn ? (
              <Link href="/dashboard" className="btn btn-primary">{t('landing.openDashboard')}</Link>
            ) : (
              <>
                <Link href="/login" style={{ fontWeight: 600, padding: '10px 0' }}>{t('login.signIn')}</Link>
                <Link href="/login" className="btn btn-primary">{t('landing.getStarted')}</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        <section style={{ ...wrap, paddingTop: '88px', paddingBottom: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '24px' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '999px',
            background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: '13px', fontWeight: 600,
          }}>
            <SparklesIcon size={14} />
            {t('landing.badge')}
          </span>
          <h1 style={{ fontSize: 'clamp(40px, 6vw, 68px)', lineHeight: 1.04, fontWeight: 700, letterSpacing: '-0.035em', maxWidth: '880px' }}>
            {t('landing.headline')}
          </h1>
          <p style={{ fontSize: '19px', color: 'var(--text-body)', maxWidth: '620px' }}>{t('landing.subhead')}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px', marginTop: '8px' }}>
            <Link href={primaryHref} className="btn btn-accent" style={bigButton}>
              {signedIn ? t('landing.openDashboard') : t('landing.ctaPrimary')}
              <ArrowRightIcon size={16} strokeWidth={2.25} />
            </Link>
            <a href="#how" className="btn btn-secondary" style={bigButton}>{t('landing.ctaSecondary')}</a>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{t('landing.reassurance')}</p>
        </section>

        <section aria-label={t('landing.previewLabel')} style={{ ...wrap, paddingBottom: '96px' }}>
          <div style={{ borderRadius: '20px', padding: '14px', background: 'var(--bg)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'stretch' }}>

              <div className="card" style={{ flex: '1 1 300px', minWidth: 0, padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <p style={panelLabelStyle}>1 · {t('landing.previewScreenshot')}</p>
                <div aria-hidden="true" style={{
                  flex: 1, minHeight: '220px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg)',
                  padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                      width: 32, height: 32, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent)',
                      fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>C</span>
                    <div style={{ lineHeight: 1.3 }}>
                      <p style={{ fontWeight: 600, fontSize: '14px' }}>Product Engineer</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Contoso · Austin, TX</p>
                    </div>
                  </div>
                  {[92, 78, 85].map(width => <span key={width} style={{ height: 8, borderRadius: 4, background: 'var(--border)', width: `${width}%` }} />)}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                    {['Full-time', '$120k–$145k', 'Oct 20'].map(tag => (
                      <span key={tag} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: 6, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-body)' }}>{tag}</span>
                    ))}
                  </div>
                  {[64, 72].map(width => <span key={width} style={{ height: 8, borderRadius: 4, background: 'var(--border)', width: `${width}%` }} />)}
                </div>
              </div>

              <div className="card" style={{ flex: '1 1 300px', minWidth: 0, padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
                  <p style={panelLabelStyle}>2 · {t('landing.previewFilled')}</p>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--status-offer-fg)', background: 'var(--status-offer-bg)', padding: '2px 8px', borderRadius: '999px' }}>
                    {t('upload.foundCount', { count: PREVIEW_FIELDS.length })}
                  </span>
                </div>
                {PREVIEW_FIELDS.map(({ field, value }) => (
                  <div key={field} style={{
                    display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '8px 12px', fontSize: '14px',
                    borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)',
                  }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{t(field)}</span>
                    <span style={{ fontWeight: 600, textAlign: 'right' }}>{value}</span>
                  </div>
                ))}
              </div>

              <div className="card" style={{ flex: '1 1 300px', minWidth: 0, padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={panelLabelStyle}>3 · {t('landing.previewDashboard')}</p>
                <div aria-hidden="true" style={{ display: 'flex', gap: '3px', height: 10, borderRadius: '999px', overflow: 'hidden' }}>
                  {(Object.keys(PREVIEW_PIPELINE) as Status[]).map(status => (
                    <span key={status} style={{ flex: PREVIEW_PIPELINE[status], background: `var(--status-${status}-fg)` }} />
                  ))}
                </div>
                <ul style={{ listStyle: 'none' }}>
                  {PREVIEW_JOBS.map(job => (
                    <li key={job.company} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderTop: '1px solid var(--border)' }}>
                      <span aria-hidden="true" style={{
                        width: 30, height: 30, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent)',
                        fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>{job.company.charAt(0)}</span>
                      <span style={{ flex: 1, minWidth: 0, lineHeight: 1.3 }}>
                        <span style={{ display: 'block', fontWeight: 600, fontSize: '14px' }}>{job.company}</span>
                        <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)' }}>{job.title}</span>
                      </span>
                      <span style={{
                        fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px',
                        background: `var(--status-${job.status}-bg)`, color: `var(--status-${job.status}-fg)`,
                      }}>{t(`status.${job.status}`)}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          </div>
        </section>

        <section id="how" className="anchor-section" style={{ background: 'var(--bg)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
          <div style={{ ...wrap, paddingTop: '96px', paddingBottom: '96px', display: 'flex', flexDirection: 'column', gap: '48px' }}>
            <div style={{ maxWidth: '640px' }}>
              <p style={eyebrowStyle}>{t('landing.navHow')}</p>
              <h2 style={h2Style}>{t('landing.howTitle')}</h2>
            </div>
            <ol style={{ listStyle: 'none', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '32px' }}>
              {STEPS.map((step, index) => (
                <li key={step.title} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <span style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: '14px', color: 'var(--accent)', fontWeight: 500 }}>
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h3 style={{ fontSize: '20px', fontWeight: 600 }}>{t(step.title)}</h3>
                  <p style={{ color: 'var(--text-body)' }}>{t(step.body)}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="features" className="anchor-section" style={{ ...wrap, paddingTop: '96px', paddingBottom: '96px', display: 'flex', flexDirection: 'column', gap: '48px' }}>
          <div style={{ maxWidth: '640px' }}>
            <p style={eyebrowStyle}>{t('landing.navFeatures')}</p>
            <h2 style={h2Style}>{t('landing.featuresTitle')}</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            {FEATURES.map(({ Icon, title, body }) => (
              <div key={title} style={{ border: '1px solid var(--border)', borderRadius: '16px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{
                  width: 44, height: 44, borderRadius: 12, background: 'var(--accent-soft)', color: 'var(--accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '6px',
                }}>
                  <Icon size={20} />
                </span>
                <h3 style={{ fontSize: '18px', fontWeight: 600 }}>{t(title)}</h3>
                <p style={{ color: 'var(--text-body)' }}>{t(body)}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="faq" className="anchor-section" style={{ background: 'var(--bg)', borderTop: '1px solid var(--border)' }}>
          <div style={{ maxWidth: '760px', margin: '0 auto', padding: '96px 24px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <h2 style={{ ...h2Style, textAlign: 'center' }}>{t('landing.faqTitle')}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {FAQ.map(({ question, answer }, index) => (
                <details key={question} className="faq" open={index === 0}>
                  <summary>{t(question)}</summary>
                  <p style={{ marginTop: '10px', color: 'var(--text-body)' }}>{t(answer)}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section style={{ ...wrap, paddingTop: '96px', paddingBottom: '96px' }}>
          <div style={{
            borderRadius: '24px', background: 'var(--primary)', color: 'var(--on-primary)', padding: '64px 32px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '20px',
          }}>
            <h2 style={{ ...h2Style, color: 'inherit', maxWidth: '640px' }}>{t('landing.closingTitle')}</h2>
            <p style={{ fontSize: '18px', maxWidth: '520px', opacity: 0.8 }}>{t('landing.closingBody')}</p>
            <Link href={primaryHref} className="btn" style={{ ...bigButton, background: 'var(--on-primary)', color: 'var(--primary)', marginTop: '8px' }}>
              {signedIn ? t('landing.openDashboard') : t('landing.closingCta')}
            </Link>
          </div>
        </section>
      </main>

      <footer style={{ borderTop: '1px solid var(--border)' }}>
        <div style={{ ...wrap, paddingTop: '24px', paddingBottom: '24px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', color: 'var(--text-secondary)', fontSize: '14px' }}>
          <span>Application Tracker</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '20px' }}>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" style={{ color: 'var(--text-body)' }}>GitHub</a>
            <div role="radiogroup" aria-label={t('settings.languageHeading')} className="segmented">
              {LANGUAGES.map(code => (
                <button key={code} type="button" role="radio" aria-checked={language === code} lang={code} onClick={() => setLanguage(code)}>
                  {LANGUAGE_NAMES[code]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
