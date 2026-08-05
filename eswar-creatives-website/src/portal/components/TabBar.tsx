// Shared tab-strip atom, extracted from the admin ProjectPanel's tab bar so
// admin and client per-project views stay pixel-identical from one source.
// Horizontal scroll strip on mobile so all tabs stay reachable (H7: keeps
// users oriented in the panel hierarchy).
import type { CSSProperties, ReactNode } from 'react'
import { tokens, t, fonts, motionTokens } from '../theme'
import { useBreakpoint } from '../hooks/useBreakpoint'

export function TabBar<T extends string>({
  tabs, active, onChange,
}: {
  tabs: { id: T; label: string }[]
  active: T
  onChange: (id: T) => void
}) {
  const { isMobile } = useBreakpoint()
  return (
    <div style={{ ...s.tabBar, ...(isMobile ? s.tabBarMobile : null) }}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          style={{
            ...s.tabBtn,
            ...(isMobile ? s.tabBtnMobile : null),
            ...(active === tab.id ? s.tabBtnActive : {}),
          }}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

// Wraps tab content so it replays the fade-in keyframe on every tab switch.
// Render once per panel, with `key={activeTab}` passed through by the caller.
export function TabFadeIn({ children }: { children: ReactNode }) {
  return (
    <>
      <style>{`@keyframes ecTabFadeIn{from{opacity:0}to{opacity:1}}`}</style>
      <div style={{ animation: `ecTabFadeIn ${motionTokens.durationFast} ${motionTokens.easeDefault}` }}>
        {children}
      </div>
    </>
  )
}

const s: Record<string, CSSProperties> = {
  tabBar: {
    display: 'flex',
    gap: 2,
    borderBottom: `2px solid ${t.border.subtle}`,
    marginBottom: 20,
    flexShrink: 0,
  },
  tabBarMobile: {
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
    flexWrap: 'nowrap',
  },
  tabBtn: {
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 500,
    color: t.text.secondary,
    background: 'none',
    border: 'none',
    padding: '8px 14px',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    marginBottom: -2,
    borderRadius: '4px 4px 0 0',
    transition: `color ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
  },
  tabBtnMobile: { minWidth: 80, padding: '12px 16px', flexShrink: 0, whiteSpace: 'nowrap' },
  tabBtnActive: {
    color: tokens.primary,
    fontWeight: 600,
    borderBottomColor: tokens.primary,
  },
}
