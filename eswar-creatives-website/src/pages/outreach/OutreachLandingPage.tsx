import { Link } from 'react-router'
import { UploadCloud, Mail, Send } from 'lucide-react'
import { t, tokens, fonts, motionTokens } from '../../portal/theme'
import { useBreakpoint } from '../../portal/hooks/useBreakpoint'

const STEPS = [
  {
    icon: UploadCloud,
    title: 'Add your leads',
    body: 'Upload a LinkedIn screenshot. We extract the contact details automatically.',
  },
  {
    icon: Mail,
    title: 'Write your sequence',
    body: 'Draft a short series of follow-up emails for your target audience.',
  },
  {
    icon: Send,
    title: 'Send with confidence',
    body: 'Daily sending limits protect your domain so your emails land in the inbox, not spam.',
  },
]

export function OutreachLandingPage() {
  const { isMobile } = useBreakpoint()

  return (
    <div style={styles.page}>
      <nav style={styles.nav}>
        <span style={styles.wordmark}>EswarCreatives</span>
        <Link to="/outreach/signup" style={styles.navCta}>
          Sign up
        </Link>
      </nav>

      <section style={styles.hero(isMobile)}>
        <span style={styles.eyebrow}>OUTREACH</span>
        <h1 style={styles.heroTitle(isMobile)}>
          Reach the right people without the guesswork
        </h1>
        <p style={styles.heroSubtitle}>
          Build cold email sequences, add leads from LinkedIn screenshots, and send with limits
          that protect your sender reputation. Free to start.
        </p>
        <Link to="/outreach/signup" style={styles.primaryButton}>
          Get started free
        </Link>
        <p style={styles.heroNote}>No credit card. Takes about 10 minutes to set up.</p>
      </section>

      <section style={styles.howItWorks(isMobile)}>
        {STEPS.map((step) => {
          const Icon = step.icon
          return (
            <div key={step.title} style={styles.stepCard}>
              <div style={styles.stepIconWrap}>
                <Icon size={24} color={tokens.primary} />
              </div>
              <h3 style={styles.stepTitle}>{step.title}</h3>
              <p style={styles.stepBody}>{step.body}</p>
            </div>
          )
        })}
      </section>

      <section style={styles.footerCta}>
        <h2 style={styles.footerTitle}>Ready to start reaching out?</h2>
        <Link to="/outreach/signup" style={styles.primaryButton}>
          Get started free
        </Link>
      </section>
    </div>
  )
}

const styles: Record<string, any> = {
  page: {
    minHeight: '100vh',
    background: t.background.page,
    fontFamily: fonts.body,
    display: 'flex',
    flexDirection: 'column',
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: `1px solid ${t.border.subtle}`,
  },
  wordmark: { fontFamily: fonts.heading, fontSize: 20, color: tokens.primary, fontWeight: 600 },
  navCta: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    padding: '0 20px',
    borderRadius: 8,
    background: tokens.primary,
    color: t.text.onPrimary,
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    textDecoration: 'none',
    transition: `background ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
  },
  hero: (isMobile: boolean) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: 16,
    padding: isMobile ? '56px 20px' : '96px 24px',
  }),
  eyebrow: {
    fontFamily: "'SF Mono', 'JetBrains Mono', 'Fira Code', monospace",
    fontSize: 10,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: tokens.gold,
  },
  heroTitle: (isMobile: boolean) => ({
    fontFamily: fonts.heading,
    fontSize: isMobile ? 28 : 40,
    lineHeight: 1.15,
    color: t.text.primary,
    margin: 0,
    maxWidth: 720,
  }),
  heroSubtitle: {
    fontFamily: fonts.body,
    fontSize: 17,
    lineHeight: 1.5,
    color: t.text.secondary,
    margin: 0,
    maxWidth: 560,
  },
  primaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    padding: '0 32px',
    borderRadius: 8,
    background: tokens.primary,
    color: t.text.onPrimary,
    fontFamily: fonts.body,
    fontSize: 15,
    fontWeight: 600,
    textDecoration: 'none',
    marginTop: 8,
    transition: `background ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
  },
  heroNote: { fontFamily: fonts.body, fontSize: 13, color: t.text.muted, margin: 0 },
  howItWorks: (isMobile: boolean) => ({
    display: 'flex',
    flexDirection: isMobile ? 'column' : 'row',
    gap: 32,
    padding: isMobile ? '0 20px 64px' : '0 24px 96px',
    maxWidth: 1000,
    margin: '0 auto',
    width: '100%',
    boxSizing: 'border-box',
  }),
  stepCard: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: 8,
  },
  stepIconWrap: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    background: t.background.tint1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepTitle: { fontFamily: fonts.heading, fontSize: 18, color: t.text.primary, margin: 0 },
  stepBody: { fontFamily: fonts.body, fontSize: 14, color: t.text.secondary, margin: 0, lineHeight: 1.5 },
  footerCta: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
    padding: '64px 24px 96px',
    borderTop: `1px solid ${t.border.subtle}`,
  },
  footerTitle: { fontFamily: fonts.heading, fontSize: 24, color: t.text.primary, margin: 0 },
}
