import { useEffect, useState } from 'react'
import { NavLink, Navigate, Outlet, useNavigate } from 'react-router'
import { Users, Send, Activity, Settings } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { t, tokens, fonts, motionTokens } from '../../portal/theme'
import { Modal } from '../../portal/admin/ui'
import { useOutreachAuth } from '../../portal/hooks/useOutreachAuth'
import { useBreakpoint } from '../../portal/hooks/useBreakpoint'

const NAV_ITEMS = [
  { to: '/outreach/app/leads', label: 'Leads', Icon: Users },
  { to: '/outreach/app/sequences', label: 'Sequences', Icon: Send },
  { to: '/outreach/app/activity', label: 'Activity', Icon: Activity },
  { to: '/outreach/app/settings', label: 'Settings', Icon: Settings },
]

// /outreach/app itself has no dashboard-overview content (out of scope for
// this pass) - land on Leads, the natural first stop.
export function OutreachDashboardIndex() {
  return <Navigate to="/outreach/app/leads" replace />
}

export function OutreachAppShell() {
  const navigate = useNavigate()
  const { isMobile } = useBreakpoint()
  const { user, loading, onboarding } = useOutreachAuth()
  const [showIcpModal, setShowIcpModal] = useState(false)
  const [dailyCap, setDailyCap] = useState<number | null>(null)

  useEffect(() => {
    if (!onboarding) return
    const loginCount = onboarding.login_count as number | undefined
    const icpIntroShown = onboarding.icp_intro_shown as boolean | undefined
    if (loginCount === 2 && !icpIntroShown) {
      setShowIcpModal(true)
    }
  }, [onboarding])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    supabase
      .from('outreach_user_settings')
      .select('daily_cap')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (!cancelled && data) setDailyCap(data.daily_cap)
      })
    return () => {
      cancelled = true
    }
  }, [user])

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
    <div style={styles.page(isMobile)}>
      {!isMobile && (
        <aside style={styles.sidebar}>
          <NavLink to="/outreach/app" style={styles.wordmark}>
            EswarCreatives
          </NavLink>
          <nav style={styles.navList}>
            {NAV_ITEMS.map(({ to, label, Icon }) => (
              <NavLink
                key={to}
                to={to}
                style={({ isActive }) => ({
                  ...styles.navItem,
                  color: isActive ? tokens.primary : t.text.secondary,
                  background: isActive ? t.background.tint1 : 'transparent',
                })}
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>
      )}

      <div style={styles.main}>
        <header style={styles.header}>
          {isMobile && <span style={styles.wordmarkMobile}>EswarCreatives</span>}
          <div style={styles.headerRight}>
            {dailyCap !== null && (
              <span style={styles.capLabel}>{dailyCap} emails/day</span>
            )}
            <NavLink to="/outreach/app/settings" style={styles.gearLink} aria-label="Settings">
              <Settings size={18} />
            </NavLink>
          </div>
        </header>

        {isMobile && (
          <nav style={styles.mobileTabs}>
            {NAV_ITEMS.map(({ to, label, Icon }) => (
              <NavLink
                key={to}
                to={to}
                style={({ isActive }) => ({
                  ...styles.mobileTab,
                  color: isActive ? tokens.primary : t.text.secondary,
                  borderBottomColor: isActive ? tokens.primary : 'transparent',
                })}
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </nav>
        )}

        <div style={styles.content}>
          <Outlet />
        </div>
      </div>

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

const styles: Record<string, any> = {
  page: (isMobile: boolean) => ({
    display: 'flex',
    flexDirection: isMobile ? 'column' : 'row',
    minHeight: '100vh',
    background: t.background.page,
    fontFamily: fonts.body,
  }),
  sidebar: {
    width: 220,
    flexShrink: 0,
    borderRight: `1px solid ${t.border.subtle}`,
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
    padding: '24px 16px',
  },
  wordmark: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: tokens.primary,
    fontWeight: 600,
    textDecoration: 'none',
    padding: '0 8px',
  },
  wordmarkMobile: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: tokens.primary,
    fontWeight: 600,
  },
  navList: { display: 'flex', flexDirection: 'column', gap: 4 },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    height: 44,
    padding: '0 12px',
    borderRadius: 8,
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 500,
    textDecoration: 'none',
    transition: `background ${motionTokens.durationFast} ${motionTokens.easeDefault}, color ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
  },
  main: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    borderBottom: `1px solid ${t.border.subtle}`,
  },
  headerRight: { display: 'flex', alignItems: 'center', gap: 16, marginLeft: 'auto' },
  capLabel: { fontFamily: fonts.body, fontSize: 13, color: t.text.secondary },
  gearLink: {
    width: 44,
    height: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: t.text.secondary,
    borderRadius: 8,
    transition: `background ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
  },
  mobileTabs: {
    display: 'flex',
    borderBottom: `1px solid ${t.border.subtle}`,
    overflowX: 'auto',
  },
  mobileTab: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    padding: '10px 8px',
    minHeight: 44,
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: 500,
    textDecoration: 'none',
    borderBottom: '2px solid transparent',
    transition: `color ${motionTokens.durationFast} ${motionTokens.easeDefault}, border-color ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
  },
  content: { flex: 1, padding: 24 },
}
