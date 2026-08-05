import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { tokens, t, fonts } from './theme'
import { PortalNav } from './PortalNav'

type Mode = 'password' | 'magic'

export function LoginPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  // Already logged in? Skip the form.
  useEffect(() => {
    let cancelled = false
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && data.session) void redirectByRole(data.session.user.id)
    })
    return () => { cancelled = true }
  }, [navigate])

  // Route a signed-in user to the right landing page by profile role.
  // Unknown roles fall back to the verify page (prior behaviour).
  async function redirectByRole(userId: string) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()
    const role = profile?.role
    if (role === 'admin' || role === 'owner') {
      // H1 (visibility of system status): staff land on the admin dashboard
      // overview (the /portal/admin index route), not a sub-module like sketches.
      navigate('/portal/admin', { replace: true })
    } else if (role === 'client') {
      navigate('/portal/dashboard', { replace: true })
    } else if (role === 'reviewer') {
      // Land the reviewer on their first campaign. RLS scopes review_campaigns
      // to reviewers, so this returns only campaigns they may see.
      const { data: campaign } = await supabase
        .from('review_campaigns')
        .select('id')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      navigate(campaign ? `/portal/review/${campaign.id}` : '/portal/review', {
        replace: true,
      })
    } else {
      navigate('/portal/verify', { replace: true })
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setBusy(true)
    try {
      if (mode === 'password') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        await redirectByRole(data.user.id)
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          // Land back on the login page so its session check can route the user
          // to the correct area by role (see redirectByRole).
          email,
          options: { emailRedirectTo: `${window.location.origin}/portal/login` },
        })
        if (error) throw error
        setInfo(`Magic link sent to ${email}. Check your inbox.`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Helmet>
        <title>Client Portal — Eswar Creatives</title>
        <meta property="og:title" content="Client Portal — Eswar Creatives" />
        <meta property="og:description" content="Track projects, approve proposals, and pay invoices all in one place." />
        <meta property="og:image" content="https://www.eswarcreatives.in/og-portal.png" />
        <meta property="og:url" content="https://www.eswarcreatives.in/portal/" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Eswar Creatives" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Client Portal — Eswar Creatives" />
        <meta name="twitter:description" content="Track projects, approve proposals, and pay invoices all in one place." />
        <meta name="twitter:image" content="https://www.eswarcreatives.in/og-portal.png" />
      </Helmet>
      <div style={styles.page}>
        <PortalNav />
      <div style={styles.center}>
        <div style={styles.shell}>
        <div style={styles.card}>
        <div style={styles.tabs}>
          <button
            type="button"
            style={mode === 'password' ? styles.tabActive : styles.tab}
            onClick={() => { setMode('password'); setError(null); setInfo(null) }}
          >Email + Password</button>
          <button
            type="button"
            style={mode === 'magic' ? styles.tabActive : styles.tab}
            onClick={() => { setMode('magic'); setError(null); setInfo(null) }}
          >Magic Link</button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
            />
          </label>

          {mode === 'password' && (
            <label style={styles.label}>
              Password
              <div style={styles.passwordWrap}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ ...styles.input, width: '100%', paddingRight: 44, boxSizing: 'border-box' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  style={styles.eyeBtn}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>
          )}

          {error && <div style={styles.error}>{error}</div>}
          {info  && <div style={styles.info}>{info}</div>}

          <button type="submit" disabled={busy} style={styles.submit}>
            {busy ? 'Working…' : mode === 'password' ? 'Sign in' : 'Send magic link'}
          </button>
        </form>
        </div>
        </div>
      </div>
      </div>
    </>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: tokens.bg, // Atelier cream
    color: tokens.text,
    fontFamily: fonts.body,
  },
  center: {
    flex: 1,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '48px 24px 24px',
  },
  shell: {
    width: '100%',
    maxWidth: 380,
    display: 'flex',
    flexDirection: 'column',
  },

  card: {
    width: '100%',
    background: tokens.surface,
    border: `1px solid ${tokens.border}`,
    borderRadius: 12,
    padding: 32,
    boxShadow: '0 12px 32px rgba(2, 76, 79, 0.08)',
  },
  tabs: {
    display: 'flex',
    gap: 4,
    marginBottom: 20,
    background: tokens.bg,
    padding: 4,
    borderRadius: 8,
  },
  tab: {
    flex: 1,
    padding: '8px 12px',
    background: 'transparent',
    color: tokens.textMuted,
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
    fontFamily: fonts.body,
    fontWeight: 500,
  },
  tabActive: {
    flex: 1,
    padding: '8px 12px',
    background: tokens.surface,
    color: tokens.primary,
    border: `1px solid ${tokens.border}`,
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
    fontFamily: fonts.body,
    fontWeight: 600,
  },
  form: { display: 'flex', flexDirection: 'column', gap: 14 },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    fontSize: 13,
    fontWeight: 500,
    color: tokens.text,
  },
  input: {
    background: tokens.inputBg,
    color: tokens.text,
    border: `1px solid ${tokens.border}`,
    borderRadius: 8,
    padding: '10px 12px',
    fontSize: 14,
    fontFamily: fonts.body,
    outline: 'none',
  },
  passwordWrap: { position: 'relative', display: 'flex', alignItems: 'center' },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 44,
    height: 44,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: t.text.muted,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submit: {
    background: tokens.primary,
    color: tokens.surface,
    border: 'none',
    borderRadius: 8,
    padding: '12px 14px',
    fontSize: 14,
    fontWeight: 600,
    fontFamily: fonts.body,
    cursor: 'pointer',
    marginTop: 4,
  },
  error: {
    background: tokens.rubyLight,
    color: tokens.ruby,
    padding: '10px 12px',
    borderRadius: 8,
    fontSize: 13,
    border: `1px solid ${tokens.ruby}33`,
  },
  info: {
    background: tokens.greenLight,
    color: tokens.green,
    padding: '10px 12px',
    borderRadius: 8,
    fontSize: 13,
    border: `1px solid ${tokens.green}33`,
  },
}
