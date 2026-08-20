import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { t, tokens, fonts, motionTokens } from '../../portal/theme'
import { useBreakpoint } from '../../portal/hooks/useBreakpoint'

export function OutreachSignupPage() {
  const { isMobile } = useBreakpoint()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(
    searchParams.get('error') === 'account_exists'
      ? 'That Google account is already registered for a different area of the portal. Sign in there instead, or use a different account here.'
      : null,
  )
  const [step, setStep] = useState<'input' | 'sent'>('input')

  async function handleGoogleSignIn() {
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/outreach/onboarding`,
      },
    })
    if (error) setError(error.message)
    setLoading(false)
  }

  async function handleSendOTP() {
    setLoading(true)
    setError(null)
    const formatted = phone.startsWith('+') ? phone : `+91${phone.replace(/\s/g, '')}`
    const { data, error } = await supabase.functions.invoke('send-otp', {
      body: { phone: formatted },
    })
    if (error || !data?.success) {
      setError('Could not send OTP. Please check the number and try again.')
      setLoading(false)
    } else {
      sessionStorage.setItem('outreach_signup_phone', formatted)
      setStep('sent')
      navigate('/outreach/verify')
    }
  }

  return (
    <div style={styles.page(isMobile)}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logoRow}>
            <span style={styles.logo}>EswarCreatives</span>
          </div>
          <span style={styles.eyebrow}>OUTREACH</span>
          <h1 style={styles.title}>Start reaching the right people</h1>
          <p style={styles.subtitle}>Set up your first email sequence in under 10 minutes.</p>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          style={styles.googleButton}
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <div style={styles.divider}>
          <div style={styles.dividerLine} />
          <span style={styles.dividerText}>or</span>
          <div style={styles.dividerLine} />
        </div>

        {step === 'input' ? (
          <>
            <label style={styles.label} htmlFor="outreach-phone">
              Mobile number
            </label>
            <div style={styles.phoneWrap}>
              <span style={styles.phonePrefix}>+91</span>
              <input
                id="outreach-phone"
                type="tel"
                placeholder="98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={styles.phoneInput}
              />
            </div>
            <button
              type="button"
              onClick={handleSendOTP}
              disabled={phone.replace(/\D/g, '').length < 10 || loading}
              style={{
                ...styles.primaryButton,
                opacity: phone.replace(/\D/g, '').length < 10 || loading ? 0.5 : 1,
                cursor: phone.replace(/\D/g, '').length < 10 || loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </>
        ) : (
          <p style={styles.sentNotice}>
            Code sent. <Link to="/outreach/verify" style={styles.link}>Enter it here</Link>
          </p>
        )}

        {error && (
          <div style={styles.error}>
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}
      </div>

      <p style={styles.footerNote}>
        Already have an account? Use Google or your mobile number above to sign back in.
      </p>
      <p style={styles.terms}>
        By signing up, you agree to use this tool responsibly. Max 25 emails per day.
      </p>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M19.6 10.23c0-.68-.06-1.36-.18-2H10v3.79h5.4a4.62 4.62 0 0 1-2 3.03v2.5h3.23c1.9-1.75 2.97-4.33 2.97-7.32Z"
      />
      <path
        fill="#34A853"
        d="M10 20c2.7 0 4.96-.89 6.63-2.42l-3.23-2.5c-.9.6-2.05.96-3.4.96-2.6 0-4.8-1.76-5.59-4.12H1.06v2.59A10 10 0 0 0 10 20Z"
      />
      <path
        fill="#FBBC05"
        d="M4.41 11.92a6.01 6.01 0 0 1 0-3.84V5.49H1.06a10 10 0 0 0 0 9.02l3.35-2.59Z"
      />
      <path
        fill="#EA4335"
        d="M10 3.96c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.6 9.6 0 0 0 10 0a10 10 0 0 0-8.94 5.49l3.35 2.59C5.2 5.72 7.4 3.96 10 3.96Z"
      />
    </svg>
  )
}

const styles: Record<string, any> = {
  page: (isMobile: boolean) => ({
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: t.background.page,
    fontFamily: fonts.body,
    padding: isMobile ? '24px 16px' : '48px 24px',
    gap: 16,
  }),
  card: {
    width: '100%',
    maxWidth: 420,
    background: t.background.surface,
    border: `1px solid ${t.border.default}`,
    borderRadius: 12,
    padding: 32,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  header: { display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 4 },
  logoRow: { marginBottom: 8 },
  logo: { fontFamily: fonts.heading, fontSize: 20, color: tokens.primary, fontWeight: 600 },
  eyebrow: {
    fontFamily: "'SF Mono', 'JetBrains Mono', 'Fira Code', monospace",
    fontSize: 10,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: tokens.gold,
  },
  title: { fontFamily: fonts.heading, fontSize: 28, color: t.text.primary, margin: '4px 0 0' },
  subtitle: { fontFamily: fonts.body, fontSize: 15, color: t.text.secondary, margin: 0 },
  googleButton: {
    width: '100%',
    height: 48,
    border: `1px solid ${t.border.default}`,
    background: t.background.surface,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    color: t.text.primary,
    cursor: 'pointer',
    transition: `background ${motionTokens.durationFast} ${motionTokens.easeDefault}, border-color ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
  },
  divider: { display: 'flex', alignItems: 'center', gap: 12 },
  dividerLine: { flex: 1, height: 1, background: t.border.subtle },
  dividerText: { fontFamily: fonts.body, fontSize: 13, color: t.text.muted },
  label: { fontFamily: fonts.body, fontSize: 13, color: t.text.secondary, marginBottom: -4 },
  phoneWrap: {
    display: 'flex',
    alignItems: 'center',
    height: 48,
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    padding: '0 16px',
    gap: 8,
    transition: `border-color ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
  },
  phonePrefix: { fontFamily: fonts.body, fontSize: 15, color: t.text.secondary },
  phoneInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    background: 'transparent',
    fontFamily: fonts.body,
    fontSize: 15,
    color: t.text.primary,
    height: '100%',
  },
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
  sentNotice: { fontFamily: fonts.body, fontSize: 14, color: t.text.secondary, margin: 0 },
  error: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 6,
    fontFamily: fonts.body,
    fontSize: 13,
    color: tokens.ruby,
  },
  footerNote: { fontFamily: fonts.body, fontSize: 13, color: t.text.muted, textAlign: 'center', margin: 0 },
  terms: { fontFamily: fonts.body, fontSize: 12, color: t.text.muted, textAlign: 'center', margin: 0, maxWidth: 340 },
  link: { color: tokens.primary, textDecoration: 'none', fontWeight: 600 },
}
