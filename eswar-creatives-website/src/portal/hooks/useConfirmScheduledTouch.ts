// Approves an outreach touch — it does NOT send it. confirm-scheduled-touch
// only stamps draft_confirmed_at and moves scheduled_for to the recipient's
// next business-hours window (per _shared/businessHours.ts); the actual
// Resend call happens later, on the 5-minute send-confirmed-outreach-touches
// cron tick. Any caller reporting "sent" here would be lying.
//
// TodayTab and ActivityTab each carried their own near-identical copy of this
// hook, which is exactly how they drifted apart before (ActivityTab kept a
// "Confirm and Send" label and a false "Email sent successfully" toast for
// months after TodayTab was corrected — see PR #21). One copy now, so a fix
// to the approve contract can only be made in one place.
import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export function useConfirmScheduledTouch(
  onSuccess: (id: string, holdUntil?: string, recipientTimezone?: string) => void
) {
  const [confirming, setConfirming] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  async function confirm(touchId: string): Promise<boolean> {
    setConfirming(touchId)
    setErrors((e) => { const n = { ...e }; delete n[touchId]; return n })
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token ?? ''
      const { data, error: fnErr } = await supabase.functions.invoke('confirm-scheduled-touch', {
        body: { touch_id: touchId },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      if (fnErr || !data || data.error) {
        // already_approved means someone else (another tab, a double-click,
        // the other outreach tab) approved this touch first — its real
        // scheduled_for is already set correctly, so a reload is the fix,
        // not a retry. The v11 server-side guard is what makes that safe.
        setErrors((e) => ({
          ...e,
          [touchId]: data?.error === 'already_approved'
            ? 'Already approved elsewhere. Refresh to see its send time.'
            : 'Could not approve. Please try again.',
        }))
        return false
      }
      onSuccess(touchId, data.hold_until as string | undefined, data.recipient_timezone as string | undefined)
      return true
    } catch {
      setErrors((e) => ({ ...e, [touchId]: 'Network error. Please try again.' }))
      return false
    } finally {
      setConfirming(null)
    }
  }

  return { confirming, errors, confirm }
}
