// Sales Cadence admin page. Four tabs: Today, Leads, Sequences, Activity.
// Route: /portal/admin/outreach. Admin-only via AdminShell guard.
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import type { CSSProperties } from 'react'
import { supabase } from '../../lib/supabase'
import { tokens, t, fonts, motionTokens } from '../theme'
import { mono, PageHeader } from './ui'
import { TodayTab } from './outreach/TodayTab'
import { LeadsTab } from './outreach/LeadsTab'
import { SequencesTab } from './outreach/SequencesTab'
import { ActivityTab } from './outreach/ActivityTab'

type Tab = 'today' | 'leads' | 'sequences' | 'activity'

const TABS: { id: Tab; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'leads', label: 'Leads' },
  { id: 'sequences', label: 'Sequences' },
  { id: 'activity', label: 'Activity' },
]

export function OutreachAdmin() {
  const [params, setParams] = useSearchParams()
  const activeTab = (params.get('tab') as Tab | null) ?? 'today'
  const [dueCount, setDueCount] = useState(0)
  const [openLeadId, setOpenLeadId] = useState<string | null>(null)

  function setTab(tab: Tab) {
    setParams({ tab })
  }

  // Load badge count (scheduled touches due today or overdue)
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    supabase
      .from('outreach_touches')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'scheduled')
      .lte('scheduled_for', today)
      .then(({ count }) => setDueCount(count ?? 0))
  }, [])

  return (
    <>
      <PageHeader
        title="Outreach"
        subtitle="Manage outbound email and LinkedIn cadences"
      />

      <div style={styles.tabBar}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              style={{
                ...styles.tabBtn,
                ...(isActive ? styles.tabBtnActive : null),
              }}
              onClick={() => setTab(tab.id)}
            >
              {tab.label}
              {tab.id === 'today' && dueCount > 0 && (
                <span style={styles.badge}>{dueCount > 99 ? '99+' : dueCount}</span>
              )}
            </button>
          )
        })}
      </div>

      <div style={styles.tabContent}>
        {activeTab === 'today' && (
          <TodayTab
            onOpenLeadDrawer={(id) => {
              setOpenLeadId(id)
              setTab('leads')
            }}
          />
        )}
        {activeTab === 'leads' && (
          <LeadsTab
            initialOpenLeadId={openLeadId}
            onDrawerClosed={() => setOpenLeadId(null)}
          />
        )}
        {activeTab === 'sequences' && <SequencesTab />}
        {activeTab === 'activity' && <ActivityTab onOpenLeadDrawer={(id) => { setOpenLeadId(id); setTab('leads') }} />}
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
