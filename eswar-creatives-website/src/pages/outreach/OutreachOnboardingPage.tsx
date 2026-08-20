import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Check, Send, Users, Lightbulb } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { t, tokens, fonts, motionTokens } from '../../portal/theme'
import { LeadImageUploader, type ExtractedLead } from './components/LeadImageUploader'

type OnboardingRow = {
  service_selected: string | null
  step_completed: number
  first_sequence_created: boolean
  first_lead_added: boolean
  onboarding_complete: boolean
}

const STEP_LABELS = ['Service', 'Daily limit', 'Sequence', 'First lead', 'Ready']
const DAILY_CAP_OPTIONS = [5, 10, 15, 20, 25] as const

const SERVICES = [
  { key: 'outreach', title: 'Email Outreach', sub: 'Cold email sequences with daily limits', available: true },
  { key: 'invoicing', title: 'Invoicing', sub: 'Coming soon', available: false },
  { key: 'icp_finder', title: 'ICP Finder', sub: 'Coming soon', available: false },
  { key: 'proposal', title: 'Proposal', sub: 'Coming soon', available: false },
  { key: 'quotation', title: 'Quotation', sub: 'Coming soon', available: false },
]

export function OutreachOnboardingPage() {
  const navigate = useNavigate()
  const [userId, setUserId] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [step, setStep] = useState(1)

  const [service, setService] = useState<string | null>(null)
  const [dailyCap, setDailyCap] = useState<number>(10)
  const [sequenceName, setSequenceName] = useState('')
  const [savingStep, setSavingStep] = useState(false)

  const [hoveredAction, setHoveredAction] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        navigate('/outreach/signup')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      let role = profile?.role
      if (role !== 'outreach_user') {
        if (role === 'client') {
          const { data: promoted } = await supabase.rpc('promote_to_outreach_user')
          if (promoted) {
            role = 'outreach_user'
          }
        }
        if (role !== 'outreach_user') {
          await supabase.auth.signOut()
          navigate('/outreach/signup?error=account_exists')
          return
        }
      }

      // Idempotent: creates settings/onboarding rows on first login, no-ops
      // on every login after (needed for the OAuth path, which never goes
      // through OutreachVerifyPage where the phone flow already calls this).
      await supabase.rpc('bootstrap_outreach_user')

      // This mount is the one place both auth paths converge: the phone flow
      // navigates here right after OutreachVerifyPage establishes a session,
      // and Google OAuth's redirectTo always points here too. That makes it
      // the single correct spot to count a login - calling this anywhere
      // else as well would double-count the phone path, and calling it only
      // on the OAuth path would miss phone signups entirely.
      await supabase.rpc('increment_outreach_login_count')

      const { data: onboarding } = await supabase
        .from('outreach_user_onboarding')
        .select('service_selected, step_completed, first_sequence_created, first_lead_added, onboarding_complete')
        .eq('user_id', session.user.id)
        .single<OnboardingRow>()

      // Returning user who already finished onboarding - don't show the
      // stepper again, go straight to the app (which is where the
      // second-login ICP popup lives).
      if (onboarding?.onboarding_complete) {
        navigate('/outreach/app')
        return
      }

      const { data: settings } = await supabase
        .from('outreach_user_settings')
        .select('daily_cap')
        .eq('user_id', session.user.id)
        .single()

      if (cancelled) return
      setUserId(session.user.id)
      if (onboarding) {
        setService(onboarding.service_selected)
        setStep(Math.min(Math.max(onboarding.step_completed + 1, 1), 5))
      }
      if (settings?.daily_cap) setDailyCap(settings.daily_cap)
      setReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [navigate])

  async function saveStep(patch: Partial<OnboardingRow>) {
    if (!userId) return
    setSavingStep(true)
    await supabase.from('outreach_user_onboarding').update(patch).eq('user_id', userId)
    setSavingStep(false)
  }

  async function handleStep1Continue() {
    if (!service) return
    await saveStep({ service_selected: service, step_completed: 1 })
    setStep(2)
  }

  async function handleStep2Continue() {
    if (!userId) return
    setSavingStep(true)
    await supabase.from('outreach_user_settings').update({ daily_cap: dailyCap }).eq('user_id', userId)
    await saveStep({ step_completed: 2 })
    setSavingStep(false)
    setStep(3)
  }

  async function handleStep3Continue() {
    if (!userId || !sequenceName.trim()) return
    setSavingStep(true)
    await supabase.from('sequences').insert({ name: sequenceName.trim(), owner_id: userId })
    await saveStep({ step_completed: 3, first_sequence_created: true })
    setSavingStep(false)
    setStep(4)
  }

  async function handleConfirmLead(lead: ExtractedLead) {
    if (!userId || !lead.first_name || !lead.company) return
    await supabase.from('leads').insert({
      first_name: lead.first_name,
      last_name: lead.last_name,
      company: lead.company,
      role_title: lead.role_title,
      email: lead.email,
      linkedin_url: lead.linkedin_url,
      // Every other insert path in this codebase (CSV import, shortlist,
      // enquiry drawer) falls back to 'saas_product' when nothing more
      // specific applies — see migration 0089. Same default here.
      segment: 'saas_product',
      source: 'manual',
      owner_id: userId,
    })
    await saveStep({ step_completed: 4, first_lead_added: true })
    setStep(5)
  }

  async function handleSkipLead() {
    await saveStep({ step_completed: 4 })
    setStep(5)
  }

  async function handleFinish() {
    if (!userId) return
    await supabase
      .from('outreach_user_onboarding')
      .update({ onboarding_complete: true, completed_at: new Date().toISOString() })
      .eq('user_id', userId)
    navigate('/outreach/app')
  }

  if (!ready) {
    return <div style={styles.page} />
  }

  return (
    <div style={styles.page}>
      <div style={styles.stepperBar}>
        {STEP_LABELS.map((label, i) => {
          const num = i + 1
          const complete = num < step
          const active = num === step
          return (
            <div key={label} style={styles.stepperItem}>
              <div
                style={{
                  ...styles.dot,
                  background: complete || active ? tokens.primary : 'transparent',
                  border: `2px solid ${complete || active ? tokens.primary : t.border.default}`,
                }}
              >
                {complete && <Check size={10} color={t.text.onPrimary} strokeWidth={3} />}
              </div>
              <span style={{ ...styles.stepperLabel, color: active ? tokens.primary : t.text.muted }}>
                {label}
              </span>
            </div>
          )
        })}
      </div>

      <div style={styles.content}>
        {step === 1 && (
          <StepShell title="What would you like to do?" subtitle="Start with one. More coming soon.">
            <div style={styles.cardList}>
              {SERVICES.map((s) => {
                const selected = service === s.key
                return (
                  <button
                    key={s.key}
                    type="button"
                    disabled={!s.available}
                    onClick={() => s.available && setService(s.key)}
                    style={{
                      ...styles.serviceCard,
                      border: `2px solid ${selected ? tokens.primary : t.border.subtle}`,
                      background: selected ? t.background.tint1 : t.background.surface,
                      opacity: s.available ? 1 : 0.5,
                      cursor: s.available ? 'pointer' : 'not-allowed',
                    }}
                  >
                    <Send size={20} color={tokens.primary} />
                    <div style={styles.serviceCardText}>
                      <div style={styles.serviceCardTitle}>{s.title}</div>
                      <div style={styles.serviceCardSub}>{s.sub}</div>
                    </div>
                    <span
                      style={{
                        ...styles.badge,
                        background: s.available ? tokens.primary : t.background.muted,
                        color: s.available ? t.text.onPrimary : t.text.muted,
                      }}
                    >
                      {s.available ? 'Available' : 'Coming soon'}
                    </span>
                  </button>
                )
              })}
            </div>
            <PrimaryButton disabled={!service || savingStep} onClick={handleStep1Continue}>
              Continue
            </PrimaryButton>
          </StepShell>
        )}

        {step === 2 && (
          <StepShell title="How many emails per day?">
            <Callout label="WHY THIS MATTERS">
              Email providers (Gmail, Outlook) flag accounts that send too many cold emails at
              once. Staying under 25 per day protects your sender reputation and keeps your
              emails out of spam. Start low (10) and increase as your domain warms up.
            </Callout>
            <div style={styles.segmentedRow}>
              {DAILY_CAP_OPTIONS.map((opt) => {
                const selected = dailyCap === opt
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setDailyCap(opt)}
                    style={{
                      ...styles.segmentedButton,
                      background: selected ? tokens.primary : t.background.surface,
                      color: selected ? t.text.onPrimary : t.text.primary,
                      border: `1px solid ${selected ? tokens.primary : t.border.default}`,
                    }}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>
            <p style={styles.helperMono}>
              {dailyCap === 5
                ? 'Safest. Best for brand new domains.'
                : dailyCap <= 10
                ? 'Recommended for new accounts.'
                : dailyCap <= 15
                ? 'Safe for warmed-up accounts.'
                : dailyCap <= 20
                ? 'For established domains only.'
                : 'Maximum allowed. Use with caution.'}
            </p>
            <PrimaryButton disabled={savingStep} onClick={handleStep2Continue}>
              Continue
            </PrimaryButton>
          </StepShell>
        )}

        {step === 3 && (
          <StepShell
            title="Name your outreach campaign"
            subtitle="A sequence is a series of emails sent to prospects over time. Give it a name that describes your goal."
          >
            <input
              type="text"
              placeholder="e.g. SaaS Founders Q3 2026"
              value={sequenceName}
              onChange={(e) => setSequenceName(e.target.value)}
              style={styles.textInput}
            />
            <div style={styles.tipRow}>
              <Lightbulb size={16} color={t.text.secondary} />
              <span style={styles.tipText}>
                Tip: Name it after your target audience and timeframe. You can create multiple
                sequences later.
              </span>
            </div>
            <PrimaryButton disabled={!sequenceName.trim() || savingStep} onClick={handleStep3Continue}>
              Continue
            </PrimaryButton>
          </StepShell>
        )}

        {step === 4 && (
          <StepShell
            title="Add your first prospect"
            subtitle="Take a screenshot of a LinkedIn profile and upload it. We will extract the contact details automatically."
          >
            <Callout label="HOW TO DO THIS">
              <ol style={styles.stepsList}>
                <li>Open LinkedIn on your phone or browser</li>
                <li>Visit the profile of someone you want to reach</li>
                <li>Take a screenshot of their profile page</li>
                <li>Upload it below</li>
              </ol>
            </Callout>

            <LeadImageUploader onConfirm={handleConfirmLead} />

            <button type="button" onClick={handleSkipLead} style={styles.ghostLink}>
              Skip for now
            </button>
          </StepShell>
        )}

        {step === 5 && (
          <StepShell
            title="You are set up."
            subtitle="Your sequence is created and your first lead is added. Here is what happens next."
          >
            <div style={styles.cardList}>
              <ActionCard
                id="sequences"
                icon={<Send size={20} color={tokens.primary} />}
                title="Write your email sequence"
                body="Draft 2-3 follow-up emails for your sequence."
                cta="Open sequences"
                hovered={hoveredAction === 'sequences'}
                onHover={setHoveredAction}
                onClick={() => navigate('/outreach/app/sequences')}
              />
              <ActionCard
                id="leads"
                icon={<Users size={20} color={tokens.primary} />}
                title="Add more leads"
                body="Upload LinkedIn screenshots to add more prospects."
                cta="Go to leads"
                hovered={hoveredAction === 'leads'}
                onHover={setHoveredAction}
                onClick={() => navigate('/outreach/app/leads')}
              />
              <ActionCard
                id="activity"
                icon={<Send size={20} color={tokens.primary} />}
                title="Start sending"
                body="Enroll leads into your sequence and send."
                cta="Go to activity"
                hovered={hoveredAction === 'activity'}
                onHover={setHoveredAction}
                onClick={() => navigate('/outreach/app/activity')}
              />
            </div>
            <PrimaryButton onClick={handleFinish}>Open my dashboard</PrimaryButton>
          </StepShell>
        )}
      </div>
    </div>
  )
}

function StepShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div style={styles.stepShell}>
      <h1 style={styles.stepTitle}>{title}</h1>
      {subtitle && <p style={styles.stepSubtitle}>{subtitle}</p>}
      {children}
    </div>
  )
}

function Callout({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={styles.callout}>
      <span style={styles.calloutLabel}>{label}</span>
      <div style={styles.calloutBody}>{children}</div>
    </div>
  )
}

function PrimaryButton({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        ...styles.primaryButton,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </button>
  )
}

function ActionCard({
  id,
  icon,
  title,
  body,
  cta,
  hovered,
  onHover,
  onClick,
}: {
  id: string
  icon: React.ReactNode
  title: string
  body: string
  cta: string
  hovered: boolean
  onHover: (id: string | null) => void
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => onHover(id)}
      onMouseLeave={() => onHover(null)}
      style={{
        ...styles.actionCard,
        borderColor: hovered ? tokens.primary : t.border.subtle,
        background: hovered ? t.background.tint1 : t.background.surface,
      }}
    >
      {icon}
      <div style={styles.serviceCardText}>
        <div style={styles.serviceCardTitle}>{title}</div>
        <div style={styles.serviceCardSub}>{body}</div>
        <span style={styles.actionCta}>{cta} →</span>
      </div>
    </button>
  )
}

const styles: Record<string, any> = {
  page: {
    minHeight: '100vh',
    background: t.background.page,
    fontFamily: fonts.body,
  },
  stepperBar: {
    position: 'sticky',
    top: 0,
    zIndex: 1,
    display: 'flex',
    justifyContent: 'center',
    gap: 24,
    padding: '20px 16px',
    background: t.background.page,
    borderBottom: `1px solid ${t.border.subtle}`,
  },
  stepperItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    boxSizing: 'content-box',
    transition: `background ${motionTokens.durationFast} ${motionTokens.easeDefault}, border-color ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
  },
  stepperLabel: {
    fontFamily: "'SF Mono', 'JetBrains Mono', 'Fira Code', monospace",
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  content: { display: 'flex', justifyContent: 'center', padding: '32px 16px 64px' },
  stepShell: { width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 16 },
  stepTitle: { fontFamily: fonts.heading, fontSize: 26, color: t.text.primary, margin: 0 },
  stepSubtitle: { fontFamily: fonts.body, fontSize: 15, color: t.text.secondary, margin: 0 },
  cardList: { display: 'flex', flexDirection: 'column', gap: 12 },
  serviceCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: 20,
    borderRadius: 10,
    textAlign: 'left',
    minHeight: 44,
    transition: `border-color ${motionTokens.durationFast} ${motionTokens.easeDefault}, background ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
  },
  serviceCardText: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2 },
  serviceCardTitle: { fontFamily: fonts.body, fontSize: 15, fontWeight: 600, color: t.text.primary },
  serviceCardSub: { fontFamily: fonts.body, fontSize: 13, color: t.text.secondary },
  badge: { fontFamily: fonts.body, fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 999, whiteSpace: 'nowrap' },
  callout: {
    background: t.background.tint1,
    borderLeft: `3px solid ${tokens.gold}`,
    borderRadius: '0 8px 8px 0',
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  calloutLabel: {
    fontFamily: "'SF Mono', 'JetBrains Mono', 'Fira Code', monospace",
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: tokens.gold,
  },
  calloutBody: { fontFamily: fonts.body, fontSize: 14, color: t.text.secondary, lineHeight: 1.5 },
  stepsList: { margin: 0, paddingLeft: 18, fontFamily: fonts.body, fontSize: 13, color: t.text.secondary, lineHeight: 1.8 },
  segmentedRow: { display: 'flex', gap: 8 },
  segmentedButton: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    fontFamily: fonts.body,
    fontSize: 16,
    fontWeight: 600,
    transition: `background ${motionTokens.durationFast} ${motionTokens.easeDefault}, border-color ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
  },
  helperMono: {
    fontFamily: "'SF Mono', 'JetBrains Mono', 'Fira Code', monospace",
    fontSize: 11,
    color: t.text.muted,
    margin: 0,
  },
  textInput: {
    height: 48,
    width: '100%',
    boxSizing: 'border-box',
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    padding: '0 16px',
    fontFamily: fonts.body,
    fontSize: 15,
    color: t.text.primary,
    outline: 'none',
    transition: `border-color ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
  },
  tipRow: { display: 'flex', gap: 8, alignItems: 'flex-start' },
  tipText: { fontFamily: fonts.body, fontSize: 14, color: t.text.secondary, lineHeight: 1.5 },
  ghostLink: {
    background: 'none',
    border: 'none',
    padding: '12px 0',
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.muted,
    textDecoration: 'underline',
    cursor: 'pointer',
    minHeight: 44,
  },
  actionCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 14,
    padding: 20,
    borderRadius: 10,
    border: `1px solid ${t.border.subtle}`,
    background: t.background.surface,
    width: '100%',
    textAlign: 'left',
    cursor: 'pointer',
    minHeight: 44,
    fontFamily: fonts.body,
    transition: `border-color ${motionTokens.durationFast} ${motionTokens.easeDefault}, background ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
  },
  actionCta: { fontFamily: fonts.body, fontSize: 13, fontWeight: 600, color: tokens.primary, marginTop: 4, display: 'inline-block' },
  primaryButton: {
    width: '100%',
    height: 48,
    background: tokens.primary,
    color: t.text.onPrimary,
    border: 'none',
    borderRadius: 8,
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    transition: `background ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
  },
}
