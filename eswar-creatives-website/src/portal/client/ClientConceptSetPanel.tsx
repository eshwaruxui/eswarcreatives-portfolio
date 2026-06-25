// Right-side slide-in panel showing one concept set's public-poll results as a
// read-only track record, opened when a client clicks "View selections" on a
// set row. Reuses the shared SidePanel (z-201, motionTokens slide, neutral
// scrim) so every portal drawer animates and stacks identically (H4).
//
// Data path: thumbnails come straight from the public logo-sketches bucket
// (mirroring PublicVotePage so file position == sketch_index), while pass/reject
// counts come from the ownership-gated get_portal_campaign_vote_summary RPC. The
// client never reads public_votes directly, so no voter PII reaches the portal.
// Theme tokens only; no raw hex; no em dashes; plain-language errors only (H9).
import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { supabase } from '../../lib/supabase'
import { SidePanel } from '../admin/SidePanel'
import { mono } from '../admin/ui'
import { tokens, t, fonts, motionTokens } from '../theme'

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

// One row of the RPC result. Counts only, never PII.
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
  // Null when the set is not tied to a portal-linked public campaign; the panel
  // then shows the empty state rather than failing.
  campaignId: string | null
  setId: string
  setName: string
  campaignName: string
  onClose: () => void
}) {
  const [concepts, setConcepts] = useState<Concept[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Drives the 120ms badge/stat entrance once the data is in.
  const [shown, setShown] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        // 1. Thumbnails: list the set's folder, sorted by name asc. The position
        // in that list IS the sketch_index (mirrors PublicVotePage:175-181 so the
        // indices line up with how votes were recorded).
        const { data: files } = await supabase.storage
          .from(BUCKET)
          .list(setId, { limit: 1000, sortBy: { column: 'name', order: 'asc' } })
        const visible = (files ?? []).filter((f) => f.name && !f.name.startsWith('.'))
        const thumbs = visible.map((f, i) => ({
          index: i,
          url: supabase.storage.from(BUCKET).getPublicUrl(`${setId}/${f.name}`).data.publicUrl,
        }))

        // 2. Vote aggregates (counts only) via the ownership-gated RPC, filtered
        // to this set. Skipped when there is no linked campaign.
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

        // 3. Merge thumbnails with counts; strongest concepts (most passes) lead.
        const merged: Concept[] = thumbs.map((th) => {
          const c = countsByIndex.get(th.index)
          return {
            index: th.index,
            url: th.url,
            passed: c?.passed ?? 0,
            rejected: c?.rejected ?? 0,
            total: c?.total ?? 0,
          }
        })
        merged.sort((a, b) => b.passed - a.passed || a.index - b.index)

        if (!cancelled) setConcepts(merged)
      } catch {
        if (!cancelled) setError(LOAD_ERROR) // H9: plain-language only.
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [campaignId, setId])

  useEffect(() => {
    if (loading) return
    const r = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(r)
  }, [loading])

  const totalPassed = concepts.reduce((n, c) => n + c.passed, 0)
  const totalRejected = concepts.reduce((n, c) => n + c.rejected, 0)

  return (
    <SidePanel title={setName} subtitle={campaignName} onClose={onClose} width={480}>
      {loading ? (
        <p style={styles.muted}>Loading...</p>
      ) : error ? (
        <p style={styles.errorText}>{error}</p>
      ) : concepts.length === 0 ? (
        <p style={styles.empty}>No selections recorded for this set.</p>
      ) : (
        <>
          {/* Sub-header: set-level pass/reject totals. */}
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

          {/* H1: the state is made explicit. This is a closed, read-only record. */}
          <p style={styles.footerNote}>Closed. View only.</p>
        </>
      )}
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
  voteCount: {
    flexShrink: 0,
    fontFamily: mono,
    fontSize: 12,
    color: t.text.muted,
    whiteSpace: 'nowrap',
  },
  footerNote: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.muted,
    margin: '20px 0 0',
  },
}
