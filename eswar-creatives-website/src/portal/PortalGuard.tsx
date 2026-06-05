import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router'
import { supabase } from '../lib/supabase'
import { tokens, fonts } from './theme'

export type PortalProfile = {
  id: string
  email: string
  role: 'owner' | 'client'
}

type State =
  | { status: 'loading' }
  | { status: 'anonymous' }
  | { status: 'authenticated'; profile: PortalProfile }

export function PortalGuard({
  children,
  requireRole,
}: {
  children: (profile: PortalProfile) => React.ReactNode
  requireRole?: 'owner' | 'client'
}) {
  const [state, setState] = useState<State>({ status: 'loading' })
  const location = useLocation()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: sess } = await supabase.auth.getSession()
      if (!sess.session) {
        if (!cancelled) setState({ status: 'anonymous' })
        return
      }
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, email, role')
        .eq('id', sess.session.user.id)
        .single()
      if (cancelled) return
      if (error || !profile) {
        setState({ status: 'anonymous' })
        return
      }
      setState({ status: 'authenticated', profile: profile as PortalProfile })
    })()
    return () => { cancelled = true }
  }, [])

  if (state.status === 'loading') {
    return <FullPageMessage text="Loading…" />
  }

  if (state.status === 'anonymous') {
    const from = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/portal/login?from=${from}`} replace />
  }

  if (requireRole && state.profile.role !== requireRole) {
    return <Navigate to="/portal" replace />
  }

  return <>{children(state.profile)}</>
}

function FullPageMessage({ text }: { text: string }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: tokens.bg,
        color: tokens.textMuted,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: fonts.body,
        fontSize: 14,
      }}
    >
      {text}
    </div>
  )
}
