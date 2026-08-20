import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { supabase } from '../../lib/supabase'

type OutreachOnboarding = {
  onboarding_complete: boolean
  [key: string]: unknown
}

export function useOutreachAuth() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [onboarding, setOnboarding] = useState<OutreachOnboarding | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        if (!cancelled) navigate('/outreach/signup')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (!profile || profile.role !== 'outreach_user') {
        if (!cancelled) navigate('/outreach/signup')
        return
      }

      if (cancelled) return
      setUser(session.user)

      const { data: ob } = await supabase
        .from('outreach_user_onboarding')
        .select('*')
        .eq('user_id', session.user.id)
        .single()

      if (cancelled) return
      setOnboarding(ob)
      if (ob && !ob.onboarding_complete) {
        navigate('/outreach/onboarding')
      }
      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [navigate])

  return { user, loading, onboarding }
}
