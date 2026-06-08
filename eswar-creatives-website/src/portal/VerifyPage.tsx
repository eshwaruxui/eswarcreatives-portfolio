import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { supabase } from '../lib/supabase'

type Status = 'pass' | 'fail' | 'pending'
type Check = {
  id: string
  title: string
  description: string
  status: Status
  detail: string
}

type Identity = {
  authUserId: string
  email: string
  role: 'owner' | 'client'
  clientId: string | null
}

export function VerifyPage() {
  const navigate = useNavigate()
  const [identity, setIdentity] = useState<Identity | null>(null)
  const [checks,   setChecks]   = useState<Check[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<unknown>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data: sess } = await supabase.auth.getSession()
        if (!sess.session) {
          navigate('/portal/login', { replace: true })
          return
        }
        const { data: prof, error: profErr } = await supabase
          .from('profiles')
          .select('id, email, role')
          .eq('id', sess.session.user.id)
          .single()
        if (profErr) throw profErr

        const { data: clientRow } = await supabase
          .from('clients')
          .select('id')
          .eq('profile_id', sess.session.user.id)
          .maybeSingle()

        const id: Identity = {
          authUserId: sess.session.user.id,
          email: prof.email,
          role: prof.role,
          clientId: clientRow?.id ?? null,
        }
        if (cancelled) return
        setIdentity(id)
        const results = await runChecks(id)
        if (cancelled) return
        setChecks(results)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [navigate])

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/portal/login', { replace: true })
  }

  const passCount = checks.filter(c => c.status === 'pass').length
  const failCount = checks.filter(c => c.status === 'fail').length

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Phase 1 RLS Verification</h1>
            <p style={styles.subtitle}>Eswar Creatives · Client Portal</p>
          </div>
          <button onClick={handleSignOut} style={styles.signout}>Sign out</button>
        </div>

        {loading && <div style={styles.muted}>Running checks…</div>}
        {error && (
          <div style={styles.error}>
            Error: {error instanceof Error ? error.message : typeof error === 'string' ? error : JSON.stringify(error, null, 2)}
          </div>
        )}

        {identity && (
          <div style={styles.card}>
            <h2 style={styles.h2}>Identity</h2>
            <KV k="Auth user id"   v={identity.authUserId} />
            <KV k="Email"          v={identity.email} />
            <KV k="Role"           v={identity.role} />
            <KV k="Client row id"  v={identity.clientId ?? '(none — owner accounts have no client row)'} />
          </div>
        )}

        {!loading && checks.length > 0 && (
          <div style={styles.card}>
            <h2 style={styles.h2}>
              RLS Checks · <span style={{ color: failCount === 0 ? '#7fdca4' : '#ff9ea0' }}>
                {passCount}/{checks.length} pass
              </span>
            </h2>
            <div style={styles.checkList}>
              {checks.map(c => (
                <div key={c.id} style={styles.checkRow}>
                  <span style={statusStyle(c.status)}>{labelFor(c.status)}</span>
                  <div style={{ flex: 1 }}>
                    <div style={styles.checkTitle}>{c.title}</div>
                    <div style={styles.checkDesc}>{c.description}</div>
                    <div style={styles.checkDetail}>{c.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// -- Checks ------------------------------------------------------------

async function runChecks(id: Identity): Promise<Check[]> {
  const checks: Check[] = []

  // 1. profiles — should return exactly 1 row: my own.
  {
    const { data, error } = await supabase.from('profiles').select('id, email, role')
    const rows = data ?? []
    const onlyOwn = rows.length === 1 && rows[0].id === id.authUserId
    if (id.role === 'client') {
      checks.push({
        id: 'profiles',
        title: 'profiles → only own row visible',
        description: 'SELECT * FROM profiles',
        status: error ? 'fail' : (onlyOwn ? 'pass' : 'fail'),
        detail: error ? `Error: ${error.message}` : `Got ${rows.length} row(s).`,
      })
    } else {
      checks.push({
        id: 'profiles',
        title: 'profiles → all profiles visible (owner)',
        description: 'SELECT * FROM profiles',
        status: error ? 'fail' : (rows.length >= 3 ? 'pass' : 'fail'),
        detail: error ? `Error: ${error.message}` : `Got ${rows.length} row(s) (expected ≥ 3 for seeded data).`,
      })
    }
  }

  // 2. clients — client sees only own; owner sees all.
  {
    const { data, error } = await supabase.from('clients').select('id, profile_id, company_name')
    const rows = data ?? []
    if (id.role === 'client') {
      const onlyOwn = rows.every(r => r.profile_id === id.authUserId) && rows.length >= 1
      checks.push({
        id: 'clients-own',
        title: 'clients → only own row visible',
        description: 'SELECT * FROM clients',
        status: error ? 'fail' : (onlyOwn ? 'pass' : 'fail'),
        detail: error
          ? `Error: ${error.message}`
          : `Got ${rows.length} row(s). All belong to me: ${rows.every(r => r.profile_id === id.authUserId)}`,
      })
    } else {
      checks.push({
        id: 'clients-all',
        title: 'clients → all rows visible (owner)',
        description: 'SELECT * FROM clients',
        status: error ? 'fail' : (rows.length >= 2 ? 'pass' : 'fail'),
        detail: error ? `Error: ${error.message}` : `Got ${rows.length} row(s) (expected ≥ 2 for seeded data).`,
      })
    }
  }

  // 3. Client-only: try to fetch OTHER clients explicitly (excluding own).
  if (id.role === 'client') {
    const { data, error } = await supabase
      .from('clients')
      .select('id')
      .neq('profile_id', id.authUserId)
    const rows = data ?? []
    checks.push({
      id: 'other-clients-hidden',
      title: 'other clients → 0 rows returned',
      description: 'SELECT * FROM clients WHERE profile_id != my_auth_id',
      status: error ? 'fail' : (rows.length === 0 ? 'pass' : 'fail'),
      detail: error ? `Error: ${error.message}` : `Got ${rows.length} row(s) (expected 0). RLS hides other clients.`,
    })
  }

  // 4. projects — client: only own (filtered by client_id); owner: all.
  {
    const { data, error } = await supabase.from('projects').select('id, client_id, title')
    const rows = data ?? []
    if (id.role === 'client') {
      const onlyOwn = rows.every(r => r.client_id === id.clientId)
      checks.push({
        id: 'projects-own',
        title: 'projects → only my projects visible',
        description: 'SELECT * FROM projects',
        status: error ? 'fail' : (onlyOwn ? 'pass' : 'fail'),
        detail: error
          ? `Error: ${error.message}`
          : `Got ${rows.length} row(s). All linked to my client_id: ${onlyOwn}`,
      })
    } else {
      checks.push({
        id: 'projects-all',
        title: 'projects → all rows visible (owner)',
        description: 'SELECT * FROM projects',
        status: error ? 'fail' : (rows.length >= 2 ? 'pass' : 'fail'),
        detail: error ? `Error: ${error.message}` : `Got ${rows.length} row(s) (expected ≥ 2 for seeded data).`,
      })
    }
  }

  // 5. time_entries — client must see 0; owner sees all.
  {
    const { data, error } = await supabase.from('time_entries').select('id, project_id, duration_minutes')
    const rows = data ?? []
    if (id.role === 'client') {
      checks.push({
        id: 'time-entries-hidden',
        title: 'time_entries → 0 rows (denied)',
        description: 'SELECT * FROM time_entries',
        status: error ? 'pass' : (rows.length === 0 ? 'pass' : 'fail'),
        detail: error
          ? `Error returned (still counts as denied): ${error.message}`
          : `Got ${rows.length} row(s) (expected 0). RLS denies all client access.`,
      })
    } else {
      checks.push({
        id: 'time-entries-visible',
        title: 'time_entries → visible (owner)',
        description: 'SELECT * FROM time_entries',
        status: error ? 'fail' : (rows.length >= 1 ? 'pass' : 'fail'),
        detail: error ? `Error: ${error.message}` : `Got ${rows.length} row(s) (expected ≥ 1 for seeded data).`,
      })
    }
  }

  // 6. services — both roles should read the catalog.
  {
    const { data, error } = await supabase.from('services').select('id, slug')
    const rows = data ?? []
    checks.push({
      id: 'services-readable',
      title: 'services → catalog readable',
      description: 'SELECT * FROM services',
      status: error ? 'fail' : (rows.length >= 1 ? 'pass' : 'fail'),
      detail: error ? `Error: ${error.message}` : `Got ${rows.length} row(s).`,
    })
  }

  // 7. service_tiers — both roles should read the catalog.
  {
    const { data, error } = await supabase.from('service_tiers').select('id, service_id, tier_name')
    const rows = data ?? []
    checks.push({
      id: 'tiers-readable',
      title: 'service_tiers → catalog readable',
      description: 'SELECT * FROM service_tiers',
      status: error ? 'fail' : (rows.length >= 1 ? 'pass' : 'fail'),
      detail: error ? `Error: ${error.message}` : `Got ${rows.length} row(s).`,
    })
  }

  // 8. Client-only: write attempt to projects must be blocked by RLS.
  if (id.role === 'client') {
    const { error } = await supabase
      .from('projects')
      .insert({
        order_id: '00000000-0000-0000-0000-000000000000',
        client_id: id.clientId,
        title: 'Should not insert',
      })
    checks.push({
      id: 'client-cannot-write',
      title: 'projects → client INSERT rejected',
      description: 'INSERT into projects as a client',
      status: error ? 'pass' : 'fail',
      detail: error
        ? `Rejected (good): ${error.message}`
        : 'Insert succeeded — that should NOT happen.',
    })
  }

  return checks
}

// -- Bits --------------------------------------------------------------

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div style={styles.kvRow}>
      <span style={styles.kvKey}>{k}</span>
      <span style={styles.kvVal}>{v}</span>
    </div>
  )
}

function labelFor(s: Status) { return s === 'pass' ? 'PASS' : s === 'fail' ? 'FAIL' : '…' }

function statusStyle(s: Status): React.CSSProperties {
  const base: React.CSSProperties = {
    display: 'inline-block',
    minWidth: 56,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.5,
    padding: '4px 8px',
    borderRadius: 4,
    marginTop: 2,
  }
  if (s === 'pass') return { ...base, background: '#13301f', color: '#7fdca4' }
  if (s === 'fail') return { ...base, background: '#3a1518', color: '#ff9ea0' }
  return { ...base, background: '#222',     color: '#9a9a9f' }
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#0e0e10',
    color: '#eaeaea',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    padding: '32px 16px',
  },
  container: { maxWidth: 760, margin: '0 auto' },
  header:    { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 },
  title:     { margin: 0, fontSize: 24, fontWeight: 600 },
  subtitle:  { margin: '4px 0 0', fontSize: 13, color: '#9a9a9f' },
  signout:   { background: 'transparent', border: '1px solid #2a2a2e', color: '#eaeaea', padding: '8px 14px', borderRadius: 6, fontSize: 13, cursor: 'pointer' },
  card:      { background: '#1a1a1d', border: '1px solid #2a2a2e', borderRadius: 12, padding: 20, marginBottom: 16 },
  h2:        { margin: '0 0 14px', fontSize: 14, fontWeight: 600, color: '#cfcfd2', textTransform: 'uppercase', letterSpacing: 0.5 },
  kvRow:     { display: 'flex', alignItems: 'baseline', gap: 12, padding: '6px 0', borderBottom: '1px solid #232327', fontSize: 13 },
  kvKey:     { color: '#9a9a9f', minWidth: 130 },
  kvVal:     { color: '#eaeaea', fontFamily: 'ui-monospace, monospace', wordBreak: 'break-all' },
  checkList: { display: 'flex', flexDirection: 'column', gap: 14 },
  checkRow:  { display: 'flex', gap: 14, alignItems: 'flex-start' },
  checkTitle:{ fontSize: 14, color: '#eaeaea' },
  checkDesc: { fontSize: 12, color: '#9a9a9f', fontFamily: 'ui-monospace, monospace', marginTop: 2 },
  checkDetail:{ fontSize: 12, color: '#cfcfd2', marginTop: 4 },
  muted:     { color: '#9a9a9f', fontSize: 13 },
  error:     { background: '#3a1518', color: '#ff9ea0', padding: '12px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 },
}
