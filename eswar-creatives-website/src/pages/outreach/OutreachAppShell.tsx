import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { supabase } from '../../lib/supabase'
import { t, tokens, fonts } from '../../portal/theme'
import { Modal } from '../../portal/admin/ui'
import { useOutreachAuth } from '../../portal/hooks/useOutreachAuth'

export function OutreachAppShell() {
  const navigate = useNavigate()
  const { user, loading, onboarding } = useOutreachAuth()
  const [showIcpModal, setShowIcpModal] = useState(false)

  useEffect(() => {
    if (!onboarding) return
    const loginCount = onboarding.login_count as number | undefined
    const icpIntroShown = onboarding.icp_intro_shown as boolean | undefined
    if (loginCount === 2 && !icpIntroShown) {
      setShowIcpModal(true)
    }
  }, [onboarding])

  async function dismissIcpModal() {
    setShowIcpModal(false)
    if (!user) return
    await supabase
      .from('outreach_user_onboarding')
      .update({ icp_intro_shown: true })
      .eq('user_id', user.id)
  }

  async function handleSetUpIcp() {
    await dismissIcpModal()
    navigate('/outreach/app/settings')
  }

  if (loading) {
    return <div style={{ minHeight: '100vh', background: t.background.page }} />
  }

  return (
    <div style={{ padding: 40, fontFamily: fonts.body, background: t.background.page, minHeight: '100vh' }}>
      OutreachAppShell — stub

      {showIcpModal && (
        <Modal title="One more thing before you send" onClose={dismissIcpModal}>
          <p style={{ fontFamily: fonts.body, fontSize: 15, color: t.text.secondary, lineHeight: 1.5, margin: 0 }}>
            Your Ideal Customer Profile (ICP) helps us surface better-matched leads and write
            sharper outreach. It takes two minutes and you can change it anytime from Settings.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
            <button
              type="button"
              onClick={handleSetUpIcp}
              style={{
                height: 48,
                background: tokens.primary,
                color: t.text.onPrimary,
                border: 'none',
                borderRadius: 8,
                fontFamily: fonts.body,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Set up my ICP
            </button>
            <button
              type="button"
              onClick={dismissIcpModal}
              style={{
                height: 44,
                background: 'none',
                color: t.text.muted,
                border: 'none',
                fontFamily: fonts.body,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Skip for now
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
