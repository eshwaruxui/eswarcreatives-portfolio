// Sales Cadence admin page. Five tabs: Today, Leads, Sequences, Activity, LinkedIn.
// Route: /portal/admin/outreach. Admin-only via AdminShell guard.
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import type { CSSProperties } from 'react'
import { Linkedin, Sparkles } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { tokens, t, fonts, motionTokens } from '../theme'
import { mono, PageHeader } from './ui'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { TodayTab } from './outreach/TodayTab'
import { LeadsTab } from './outreach/LeadsTab'
import { SequencesTab } from './outreach/SequencesTab'
import { ActivityTab } from './outreach/ActivityTab'
import { LinkedInTab } from './outreach/LinkedInTab'
import { SmartShortlistTab } from './outreach/SmartShortlistTab'

type Tab = 'today' | 'leads' | 'sequences' | 'activity' | 'linkedin' | 'shortlist'

const TABS: { id: Tab; label: string; icon?: React.ReactNode }[] = [
  { id: 'today', label: 'Today' },
  { id: 'leads', label: 'Leads' },
  { id: 'sequences', label: 'Sequences' },
  { id: 'activity', label: 'Activity' },
  { id: 'linkedin', label: 'LinkedIn', icon: <Linkedin size={14} /> },
  { id: 'shortlist', label: 'Smart Shortlist', icon: <Sparkles size={14} /> },
]

export function OutreachAdmin() {
  const { isMobile } = useBreakpoint()
  const [params, setParams] = useSearchParams()
  const activeTab = (params.get('tab') as Tab | null) ?? 'today'
  const [dueCount, setDueCount] = useState(0)

  function setTab(tab: Tab) {
    setParams({ tab })
  }

  function loadDueCount() {
    const today = new Date().toISOString().slice(0, 10)
    supabase
      .from('outreach_touches')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'scheduled')
      .lte('scheduled_for', today)
      .then(({ count }) => setDueCount(count ?? 0))
  }

  // Load badge count on mount; re-fetched via loadDueCount after any queue action
  useEffect(() => { loadDueCount() }, [])

  return (
    <>
      <PageHeader
        title="Outreach"
        subtitle="Manage outbound email and LinkedIn cadences"
      />

      <div style={{ ...styles.tabBar, ...(isMobile ? styles.tabBarMobile : null) }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              style={{
                ...styles.tabBtn,
                ...(isMobile ? styles.tabBtnMobile : null),
                ...(isActive ? styles.tabBtnActive : null),
              }}
              onClick={() => setTab(tab.id)}
            >
              {tab.icon}
              {tab.label}
              {tab.id === 'today' && dueCount > 0 && (
                <span style={styles.badge}>{dueCount > 99 ? '99+' : dueCount}</span>
              )}
            </button>
          )
        })}
      </div>

      <style>{`@keyframes ecTabFadeIn{from{opacity:0}to{opacity:1}}`}</style>
      <div key={activeTab} style={{ ...styles.tabContent, animation: `ecTabFadeIn ${motionTokens.durationFast} ${motionTokens.easeDefault}` }}>
        {activeTab === 'today' && <TodayTab onRefreshCount={loadDueCount} />}
        {activeTab === 'leads' && <LeadsTab />}
        {activeTab === 'sequences' && <SequencesTab />}
        {activeTab === 'activity' && <ActivityTab />}
        {activeTab === 'linkedin' && <LinkedInTab />}
        {activeTab === 'shortlist' && <SmartShortlistTab />}
      </div>
    </>
  )
}

const styles: Record<string, CSSProperties> = {
  tabBar: {
    display: 'flex',
    gap: 2,
    borderBottom: `1px solid ${t.border.subtle}`,
    marginBottom: 24,
  },
  // Horizontal scrollable strip on mobile, no wrap, so all 5 tabs stay reachable.
  tabBarMobile: {
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
    flexWrap: 'nowrap',
  },
  tabBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 500,
    color: t.text.secondary,
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    padding: '10px 16px',
    cursor: 'pointer',
    transition: `color ${motionTokens.durationFast} ${motionTokens.easeDefault}, border-color ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
    marginBottom: -1,
  },
  tabBtnMobile: {
    fontSize: 13,
    minWidth: 90,
    padding: '12px 16px',
    flexShrink: 0,
    whiteSpace: 'nowrap',
    justifyContent: 'center',
  },
  tabBtnActive: {
    color: tokens.primary,
    fontWeight: 600,
    borderBottomColor: tokens.primary,
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: tokens.ruby,
    color: t.text.onPrimary,
    fontFamily: mono,
    fontSize: 10,
    fontWeight: 700,
    borderRadius: 999,
    minWidth: 18,
    height: 18,
    padding: '0 5px',
    lineHeight: 1,
  },
  tabContent: {
    minHeight: 200,
  },
}
