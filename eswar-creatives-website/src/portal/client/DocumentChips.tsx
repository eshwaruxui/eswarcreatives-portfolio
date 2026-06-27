// Progressive document list rendered as pill chips. Shows 3 by default; each
// "Show more" reveals the next 5, and "Show less" collapses back to 3. The
// reveal animates with the max-height trick (measure scrollHeight, transition
// max-height) so the container grows smoothly without animating layout width.
import { useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { tokens, t, fonts, motionTokens } from '../theme'

export type ClientDocument = { id: string; file_name: string; file_url: string }

const INITIAL = 3
const STEP = 5

export function DocumentChips({ documents }: { documents: ClientDocument[] }) {
  const [visible, setVisible] = useState(INITIAL)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [maxHeight, setMaxHeight] = useState<number | undefined>(undefined)

  // Measure the natural height after each reveal so max-height can transition to it.
  useLayoutEffect(() => {
    if (wrapRef.current) setMaxHeight(wrapRef.current.scrollHeight)
  }, [visible, documents.length])

  if (documents.length === 0) {
    return <p style={styles.empty}>No documents yet.</p>
  }

  const shown = documents.slice(0, visible)
  const canShowMore = documents.length > visible
  const canShowLess = visible > INITIAL

  return (
    <div>
      <div
        style={{ ...styles.chipWrap, maxHeight: maxHeight !== undefined ? maxHeight : 'none' }}
      >
        <div ref={wrapRef} style={styles.chipInner}>
          {shown.map((doc) => (
            <a
              key={doc.id}
              href={doc.file_url}
              target="_blank"
              rel="noreferrer"
              style={styles.chip}
            >
              {doc.file_name}
            </a>
          ))}
        </div>
      </div>
      {(canShowMore || canShowLess) && (
        <div style={styles.actions}>
          {canShowMore && (
            <button
              type="button"
              style={styles.linkBtn}
              onClick={() => setVisible((v) => Math.min(v + STEP, documents.length))}
            >
              Show more
            </button>
          )}
          {canShowLess && (
            <button type="button" style={styles.linkBtn} onClick={() => setVisible(INITIAL)}>
              Show less
            </button>
          )}
        </div>
      )}
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  chipWrap: {
    overflow: 'hidden',
    transition: `max-height ${motionTokens.durationBase} ${motionTokens.easeEnter}`,
  },
  chipInner: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  chip: {
    display: 'inline-block',
    background: tokens.tealLight,
    color: tokens.primary,
    border: `1px solid ${tokens.border}`,
    borderRadius: 999,
    padding: '6px 12px',
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 500,
    textDecoration: 'none',
  },
  actions: { display: 'flex', gap: 16, marginTop: 10 },
  linkBtn: {
    background: 'transparent',
    border: 'none',
    color: tokens.accent,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    padding: 0,
  },
  empty: { fontFamily: fonts.body, fontSize: 13, color: t.text.secondary, margin: 0 },
}
