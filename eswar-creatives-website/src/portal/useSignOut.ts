// Shared sign-out behaviour for every portal nav (client nav, admin top bar,
// legacy portal nav). Centralises the H1 (visibility of system status) pattern:
// the action is acknowledged immediately, the trigger is disabled to prevent a
// double-click, and failures surface plain-language copy (never raw err.message).
import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router'
import { supabase } from '../lib/supabase'

export function useSignOut() {
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const signOut = useCallback(async () => {
    if (signingOut) return // H5: error prevention — ignore double-clicks.
    setError(null)
    setSigningOut(true)
    const { error: err } = await supabase.auth.signOut()
    if (err) {
      // Never surface raw err.message to the client.
      setSigningOut(false)
      setError('Sign out failed. Please try again.')
      return
    }
    navigate('/portal/login', { replace: true })
  }, [navigate, signingOut])

  return { signingOut, error, signOut }
}
