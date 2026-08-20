import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { t, tokens, fonts, motionTokens } from '../../portal/theme'
import { invokeErrorCode } from '../../portal/utils/invokeError'

const RESEND_COOLDOWN_SECONDS = 30

export function OutreachVerifyPage() {
  const navigate = useNavigate()
  const [phone, setPhone] = useState<string | null>(null)
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem('outreach_signup_phone')
    if (!stored) {
      navigate('/outreach/signup')
      return
    }
    setPhone(stored)
  }, [navigate])

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCooldown((c) => (c > 0 ? c - 1 : 0))
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  async function handleVerify() {
    if (!phone) return
    setLoading(true)
    setError(null)
    const { data, error: fnErr } = await supabase.functions.invoke('verify-otp', {
      body: { phone, otp },
    })
    const code = await invokeErrorCode(data, fnErr)
    if (code || !data?.success || !data?.token_hash) {
      setError('Invalid or expired code. Please try again.')
      setLoading(false)
      return
    }

    const { error: sessionErr } = await supabase.auth.verifyOtp({
      token_hash: data.token_hash,
      type: 'magiclink',
    })
    if (sessionErr) {
      setError('Could not sign you in. Please try again.')
      setLoading(false)
      return
    }

    await supabase.rpc('bootstrap_outreach_user')

    sessionStorage.removeItem('outreach_signup_phone')
    navigate('/outreach/onboarding')
    setLoading(false)
  }

  async function handleResend() {
    if (!phone || cooldown > 0) return
    setError(null)
    const { data, error: fnErr } = await supabase.functions.invoke('send-otp', {
      body: { phone },
    })
    if (fnErr || !data?.success) {
      setError('Could not resend the code. Please try again.')
      return
    }
    setCooldown(RESEND_COOLDOWN_SECONDS)
  }

  const lastFour = phone ? phone.slice(-4) : '••••'

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <Link to="/outreach/signup" style={styles.back}>
          <ArrowLeft size={16} />
        </Link>
        <h1 style={styles.title}>Enter the 6-digit code</h1>
        <p style={styles.subtitle}>Sent to +91 {'X'.repeat(6)}{lastFour}</p>

        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="000000"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
          style={styles.otpInput}
        />

        <button
          type="button"
          onClick={handleVerify}
          disabled={otp.length < 6 || loading}
          style={{
            ...styles.primaryButton,
            opacity: otp.length < 6 || loading ? 0.5 : 1,
            cursor: otp.length < 6 || loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Verifying...' : 'Verify and continue'}
        </button>

        {error && (
          <div style={styles.error}>
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        <p style={styles.resendRow}>
          Didn&apos;t receive it?{' '}
          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0}
            style={{
              ...styles.resendButton,
              color: cooldown > 0 ? t.text.muted : tokens.primary,
              cursor: cooldown > 0 ? 'default' : 'pointer',
            }}
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
          </button>
        </p>
      </div>
    </div>
  )
}

const styles: Record<string, any> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: t.background.page,
    fontFamily: fonts.body,
    padding: '48px 24px',
  },
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
  back: {
    width: 44,
    height: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -12,
    color: t.text.secondary,
    transition: `color ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
  },
  title: { fontFamily: fonts.heading, fontSize: 24, color: t.text.primary, margin: 0 },
  subtitle: { fontFamily: fonts.body, fontSize: 14, color: t.text.secondary, margin: 0 },
  otpInput: {
    height: 64,
    width: '100%',
    textAlign: 'center',
    letterSpacing: '0.3em',
    fontSize: 24,
    fontFamily: "'SF Mono', 'JetBrains Mono', 'Fira Code', monospace",
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    outline: 'none',
    color: t.text.primary,
    boxSizing: 'border-box',
    transition: `border-color ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
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
  error: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 6,
    fontFamily: fonts.body,
    fontSize: 13,
    color: tokens.ruby,
  },
  resendRow: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.muted,
    textAlign: 'center',
    margin: 0,
  },
  resendButton: {
    background: 'none',
    border: 'none',
    padding: 0,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    textDecoration: 'underline',
  },
}
