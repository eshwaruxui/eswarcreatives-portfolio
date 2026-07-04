import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { supabase } from '../lib/supabase'

type Mode = 'password' | 'magic'

export function LoginPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  // Already logged in? Skip the form.
  useEffect(() => {
    let cancelled = false
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && data.session) navigate('/portal/verify', { replace: true })
    })
    return () => { cancelled = true }
  }, [navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setBusy(true)
    try {
      if (mode === 'password') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        navigate('/portal/verify', { replace: true })
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${window.location.origin}/portal/verify` },
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
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Client Portal</h1>
        <p style={styles.subtitle}>Eswar Creatives · Phase 1</p>

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
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
              />
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
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0e0e10',
    color: '#eaeaea',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    background: '#1a1a1d',
    border: '1px solid #2a2a2e',
    borderRadius: 12,
    padding: 32,
  },
  title:    { margin: 0, fontSize: 22, fontWeight: 600 },
  subtitle: { margin: '4px 0 24px', fontSize: 13, color: '#9a9a9f' },
  tabs:     { display: 'flex', gap: 4, marginBottom: 20, background: '#0e0e10', padding: 4, borderRadius: 8 },
  tab:      { flex: 1, padding: '8px 12px', background: 'transparent', color: '#9a9a9f', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 },
  tabActive:{ flex: 1, padding: '8px 12px', background: '#2a2a2e', color: '#eaeaea', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 },
  form:     { display: 'flex', flexDirection: 'column', gap: 14 },
  label:    { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#cfcfd2' },
  input:    { background: '#0e0e10', color: '#eaeaea', border: '1px solid #2a2a2e', borderRadius: 6, padding: '10px 12px', fontSize: 14, outline: 'none' },
  submit:   { background: '#eaeaea', color: '#0e0e10', border: 'none', borderRadius: 6, padding: '10px 14px', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 4 },
  error:    { background: '#3a1518', color: '#ff9ea0', padding: '10px 12px', borderRadius: 6, fontSize: 13 },
  info:     { background: '#13301f', color: '#7fdca4', padding: '10px 12px', borderRadius: 6, fontSize: 13 },
}
