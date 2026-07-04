// Right-side slide-in panel showing one concept set's public-poll results as a
// read-only track record, opened when a client clicks "View selections" on a
// set row. On desktop: reuses the shared SidePanel (z-201, motionTokens slide,
// neutral scrim) so every portal drawer animates and stacks identically (H4).
// On mobile: full-screen overlay (position fixed, 100vw 100dvh) with a close
// button top-right, slides up from bottom, and supports swipe-down to dismiss.
//
// Data path: thumbnails from the public logo-sketches bucket; pass/reject counts
// from the ownership-gated get_portal_campaign_vote_summary RPC. No voter PII.
// Theme tokens only; no raw hex; no em dashes; plain-language errors only (H9).
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { SidePanel } from '../admin/SidePanel'
import { mono } from '../admin/ui'
import { tokens, t, fonts, motionTokens } from '../theme'
import { useBreakpoint } from '../hooks/useBreakpoint'

const BUCKET = 'logo-sketches'

const LOAD_ERROR =
  'We could not load these selections. Please refresh or contact eswar@eswarcreatives.in'

type Concept = {
  index: number
  url: string
  passed: number
  rejected: number
  total: number
}

type VoteSummaryRow = {
  set_id: string
  sketch_index: number
  passed: number
  rejected: number
  total: number
}

export function ClientConceptSetPanel({
  campaignId,
  setId,
  setName,
  campaignName,
  onClose,
}: {
  campaignId: string | null
  setId: string
  setName: string
  campaignName: string
  onClose: () => void
}) {
  const [concepts, setConcepts] = useState<Concept[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [shown, setShown] = useState(false)
  const { isMobile } = useBreakpoint()

  // Swipe-down-to-close: track pointer position on the overlay handle.
  const swipeRef = useRef({ startY: 0, active: false })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const { data: files } = await supabase.storage
          .from(BUCKET)
          .list(setId, { limit: 1000, sortBy: { column: 'name', order: 'asc' } })
        const visible = (files ?? []).filter((f) => f.name && !f.name.startsWith('.'))
        const thumbs = visible.map((f, i) => ({
          index: i,
          url: supabase.storage.from(BUCKET).getPublicUrl(`${setId}/${f.name}`).data.publicUrl,
        }))

        const countsByIndex = new Map<number, { passed: number; rejected: number; total: number }>()
        if (campaignId) {
          const { data: rows, error: rpcErr } = await supabase.rpc(
            'get_portal_campaign_vote_summary',
            { p_campaign_id: campaignId }
          )
          if (rpcErr) throw rpcErr
          for (const r of (rows ?? []) as VoteSummaryRow[]) {
            if (r.set_id !== setId) continue
            countsByIndex.set(r.sketch_index, {
              passed: Number(r.passed),
              rejected: Number(r.rejected),
              total: Number(r.total),
            })
          }
        }

        const merged: Concept[] = thumbs.map((th) => {
          const c = countsByIndex.get(th.index)
          return { index: th.index, url: th.url, passed: c?.passed ?? 0, rejected: c?.rejected ?? 0, total: c?.total ?? 0 }
        })
        merged.sort((a, b) => b.passed - a.passed || a.index - b.index)

        if (!cancelled) setConcepts(merged)
      } catch {
        if (!cancelled) setError(LOAD_ERROR)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [campaignId, setId])

  useEffect(() => {
    if (loading) return
    const r = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(r)
  }, [loading])

  const totalPassed = concepts.reduce((n, c) => n + c.passed, 0)
  const totalRejected = concepts.reduce((n, c) => n + c.rejected, 0)

  const body = loading ? (
    <p style={styles.muted}>Loading...</p>
  ) : error ? (
    <p style={styles.errorText}>{error}</p>
  ) : concepts.length === 0 ? (
    <p style={styles.empty}>No selections recorded for this set.</p>
  ) : (
    <>
      <div style={styles.summaryRow}>
        <span style={{ ...styles.stat, ...styles.passStat }}>{totalPassed} passed</span>
        <span style={{ ...styles.stat, ...styles.rejectStat }}>{totalRejected} rejected</span>
      </div>
      <div style={styles.divider} />
      <div
        style={{
          ...styles.list,
          opacity: shown ? 1 : 0,
          transition: `opacity ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
        }}
      >
        {concepts.map((c) => (
          <div key={c.index} style={styles.conceptRow}>
            <div style={styles.thumbWrap}>
              {c.url ? (
                <img
                  src={c.url}
                  alt={`${setName} concept ${c.index + 1}`}
                  style={styles.thumb}
                  loading="lazy"
                />
              ) : (
                <div style={styles.thumbFallback} />
              )}
            </div>
            <div style={styles.conceptMain}>
              <div style={styles.conceptTitle}>{`${setName} · Concept ${c.index + 1}`}</div>
              <div style={styles.badgeRow}>
                <span style={{ ...styles.stat, ...styles.passStat }}>{c.passed} passed</span>
                <span style={{ ...styles.stat, ...styles.rejectStat }}>{c.rejected} rejected</span>
              </div>
            </div>
            <span style={styles.voteCount}>{c.total} votes</span>
          </div>
        ))}
      </div>
      <p style={styles.footerNote}>Closed. View only.</p>
    </>
  )

  // Mobile: full-screen overlay with swipe-down-to-close.
  if (isMobile) {
    const handleTouchStart = (e: React.TouchEvent) => {
      swipeRef.current = { startY: e.touches[0].clientY, active: true }
    }
    const handleTouchEnd = (e: React.TouchEvent) => {
      if (!swipeRef.current.active) return
      swipeRef.current.active = false
      const dy = e.changedTouches[0].clientY - swipeRef.current.startY
      // Swipe down >= 80px from the top drag handle dismisses the panel (H7).
      if (dy > 80) onClose()
    }

    return (
      <>
        <div style={styles.backdrop} onClick={onClose} />
        <div
          style={{
            ...styles.mobileOverlay,
            transform: shown ? 'translateY(0)' : 'translateY(100%)',
          }}
          role="dialog"
          aria-label={setName}
        >
          {/* Drag handle -- the swipe target at the top of the sheet. */}
          <div
            style={styles.dragHandle}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div style={styles.dragPill} />
          </div>

          {/* Header with title + close button (>= 44px). */}
          <div style={styles.mobileHeader}>
            <div style={{ minWidth: 0 }}>
              <div style={styles.mobileTitle}>{setName}</div>
              <div style={styles.mobileSub}>{campaignName}</div>
            </div>
            <button
              type="button"
              style={styles.mobileClose}
              onClick={onClose}
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          <div style={styles.mobileBody}>{body}</div>
        </div>
      </>
    )
  }

  // Desktop: shared SidePanel.
  return (
    <SidePanel title={setName} subtitle={campaignName} onClose={onClose} width={480}>
      {body}
    </SidePanel>
  )
}

const styles: Record<string, CSSProperties> = {
  muted: { fontFamily: fonts.body, fontSize: 14, color: t.text.muted },
  errorText: { fontFamily: fonts.body, fontSize: 14, color: tokens.ruby, margin: 0 },
  empty: { fontFamily: fonts.body, fontSize: 14, color: t.text.muted, margin: 0 },
  summaryRow: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 16 },
  divider: { height: 1, background: tokens.border, margin: '0 0 16px' },
  list: { display: 'flex', flexDirection: 'column', gap: 12 },
  conceptRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: 12,
    background: tokens.bg,
    border: `1px solid ${tokens.border}`,
    borderRadius: 12,
  },
  thumbWrap: { flexShrink: 0 },
  thumb: {
    width: 56,
    height: 56,
    objectFit: 'contain',
    background: tokens.surface,
    border: `1px solid ${tokens.border}`,
    borderRadius: 8,
  },
  thumbFallback: {
    width: 56,
    height: 56,
    background: tokens.surface,
    border: `1px solid ${tokens.border}`,
    borderRadius: 8,
  },
  conceptMain: { minWidth: 0, flex: 1 },
  conceptTitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    color: t.text.primary,
    marginBottom: 8,
  },
  badgeRow: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  stat: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 600,
    fontFamily: fonts.body,
    whiteSpace: 'nowrap',
  },
  passStat: { background: tokens.greenLight, color: tokens.green },
  rejectStat: { background: tokens.rubyLight, color: tokens.ruby },
  voteCount: { flexShrink: 0, fontFamily: mono, fontSize: 12, color: t.text.muted, whiteSpace: 'nowrap' },
  footerNote: { fontFamily: fonts.body, fontSize: 13, color: t.text.muted, margin: '20px 0 0' },

  // Mobile overlay styles.
  backdrop: { position: 'fixed', inset: 0, background: 'rgba(10, 26, 27, 0.4)', zIndex: 200 },
  mobileOverlay: {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    // 100dvh covers the full dynamic viewport including the address bar area.
    height: '100dvh',
    background: tokens.surface,
    zIndex: 201,
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  dragHandle: {
    // 48px tall drag zone for comfortable swipe affordance (H7).
    height: 48,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    cursor: 'grab',
  },
  dragPill: {
    width: 36,
    height: 4,
    borderRadius: 2,
    background: t.border.medium,
  },
  mobileHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '0 20px 16px',
    flexShrink: 0,
    borderBottom: `1px solid ${t.border.subtle}`,
  },
  mobileTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    fontWeight: 600,
    color: t.text.primary,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  mobileSub: { fontFamily: fonts.body, fontSize: 13, color: t.text.muted, marginTop: 2 },
  // 44px touch target for close button (H7).
  mobileClose: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    background: t.background.subtle,
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    color: t.text.tertiary,
    cursor: 'pointer',
    padding: 0,
    flexShrink: 0,
  },
  mobileBody: { flex: 1, overflowY: 'auto', padding: '16px 20px 32px' },
}
