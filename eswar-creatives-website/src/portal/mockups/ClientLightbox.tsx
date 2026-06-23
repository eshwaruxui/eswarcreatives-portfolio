// Full-screen client review lightbox, ported from the Eswar Creatives mockup
// preview artifact. The original visuals are preserved verbatim (dark stage,
// prev/next peek, thumbnail strip, brand footer, gold counter); the changes for
// the portal are:
//   - images come from Supabase signed URLs via the `url` on each mockup,
//   - the loading spinner is removed so images fade in silently,
//   - the demo "Approve" toggle in the header is replaced by a status chip that
//     reflects the persisted concept decision,
//   - a client-only feedback panel writes per-image comments and a concept
//     decision (approve / request changes) to `mockup_feedback`.
//
// The artifact's self-contained `T` design-token object is kept as-is rather
// than remapped onto theme.ts: this is an immersive dark surface with its own
// palette, and faithful visual fidelity was the explicit goal.
import { useState, useEffect, useRef, useCallback } from 'react'
import type { CSSProperties, JSX } from 'react'
import { supabase } from '../../lib/supabase'
import type { LightboxMockup, LightboxMeta } from './signItems'

/* Eswar Creatives design tokens (lightbox-local, dark surface) */
const T = {
  teal50: '#E0F7F6', teal100: '#CCF0EE', teal400: '#009990', teal500: '#005F5A', teal600: '#005450', teal800: '#002220',
  gold50: '#FAF4EA', gold100: '#F6EEDB', gold200: '#EDDDB5', gold400: '#D5B067', gold500: '#C49000',
  n0: '#FFFFFF', n10: '#FAFAF9', n50: '#F5F5F4', n100: '#EAEAE8', n150: '#E5E5E4', n200: '#DDDDDD',
  n300: '#BBBBBB', n400: '#999999', n500: '#717171', n600: '#555555', n700: '#3A3A3A', n800: '#222222', n900: '#111111',
  ruby500: '#D42244', ruby50: '#FCEEF1', forest600: '#1B6B4A', forest50: '#E8F8F0',
  fH: "'Fraunces',Georgia,serif", fB: "'Inter',-apple-system,sans-serif", fM: "'SF Mono','JetBrains Mono',monospace",
  r: { sm: 6, md: 8, lg: 12, xl: 16 },
  e300: '0 4px 8px rgba(0,95,90,.10),0 1px 2px rgba(0,95,90,.06)',
  e500: '0 12px 24px rgba(27,28,30,.14),0 4px 8px rgba(27,28,30,.08)',
}

/* Inline SVG icons used by the lightbox */
const Ic: Record<string, JSX.Element> = {
  chevL: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  chevR: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M8 4L14 10L8 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  check: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8.5L6.5 12L13 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  x: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 4L14 14M14 4L4 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
}

function fmtDate(d: string): string {
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

type Decision = 'approved' | 'changes'

export function ClientLightbox({
  mockups,
  meta,
  onClose,
  isAdmin,
  setId,
}: {
  mockups: LightboxMockup[]
  meta: LightboxMeta
  onClose: () => void
  isAdmin: boolean
  setId: string
}) {
  const [idx, setIdx] = useState(0)
  const [loaded, setLoaded] = useState<Record<number, boolean>>({})
  const [dir, setDir] = useState(0) // -1 left, 1 right, 0 initial
  const [animating, setAnimating] = useState(false)
  const touchRef = useRef({ startX: 0, startY: 0, swiping: false })
  const containerRef = useRef<HTMLDivElement>(null)
  const total = mockups.length

  // ── Feedback state (client view only) ──
  const [comment, setComment] = useState('')
  const [itemSaving, setItemSaving] = useState(false)
  const [itemSavedFor, setItemSavedFor] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [decisionSaving, setDecisionSaving] = useState(false)
  const [decision, setDecision] = useState<Decision | null>(null)
  const [fbError, setFbError] = useState<string | null>(null)

  const go = useCallback(
    (d: number) => {
      if (animating || total < 2) return
      setDir(d)
      setAnimating(true)
      setTimeout(() => {
        setIdx((p) => (p + d + total) % total)
        setAnimating(false)
      }, 280)
    },
    [animating, total]
  )

  const prev = useCallback(() => go(-1), [go])
  const next = useCallback(() => go(1), [go])

  // Keyboard
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'ArrowRight') next()
      else if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [prev, next, onClose])

  // Touch/swipe
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    touchRef.current = { startX: t.clientX, startY: t.clientY, swiping: true }
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchRef.current.swiping) return
    const dx = e.changedTouches[0].clientX - touchRef.current.startX
    const dy = e.changedTouches[0].clientY - touchRef.current.startY
    touchRef.current.swiping = false
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) prev()
      else next()
    }
  }

  // Preload adjacent
  useEffect(() => {
    const preload = (i: number) => {
      if (i >= 0 && i < total && !loaded[i]) {
        const img = new Image()
        img.src = mockups[i].url
      }
    }
    preload(idx - 1)
    preload(idx + 1)
  }, [idx, total, mockups, loaded])

  const onImgLoad = (i: number) => setLoaded((p) => ({ ...p, [i]: true }))

  const prevIdx = (idx - 1 + total) % total
  const nextIdx = (idx + 1) % total

  const getTransform = () => {
    if (!animating) return 'translateX(0)'
    return dir < 0 ? 'translateX(8%)' : 'translateX(-8%)'
  }

  async function submitComment() {
    const text = comment.trim()
    if (!text) return
    setItemSaving(true)
    setFbError(null)
    try {
      const { data: sess } = await supabase.auth.getUser()
      const { error } = await supabase.from('mockup_feedback').insert({
        set_id: setId,
        item_id: mockups[idx].id,
        submitted_by: sess.user?.id ?? null,
        feedback_type: 'item_comment',
        comment: text,
      })
      if (error) throw error
      setComment('')
      setItemSavedFor(mockups[idx].id)
      setTimeout(() => setItemSavedFor(null), 2500)
    } catch {
      setFbError('Could not save your comment. Try again.')
    } finally {
      setItemSaving(false)
    }
  }

  async function submitDecision(kind: Decision) {
    setDecisionSaving(true)
    setFbError(null)
    try {
      const { data: sess } = await supabase.auth.getUser()
      const { error } = await supabase.from('mockup_feedback').insert({
        set_id: setId,
        item_id: null,
        submitted_by: sess.user?.id ?? null,
        feedback_type: kind === 'approved' ? 'concept_approval' : 'concept_rejection',
        comment: note.trim() || null,
      })
      if (error) throw error
      setDecision(kind)
    } catch {
      setFbError('Could not submit your decision. Try again.')
    } finally {
      setDecisionSaving(false)
    }
  }

  return (
    <div
      ref={containerRef}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(10,10,10,.96)', backdropFilter: 'blur(8px)',
        display: 'flex', flexDirection: 'column',
        fontFamily: T.fB, color: T.n0,
        userSelect: 'none', WebkitUserSelect: 'none',
      }}
    >
      {/* ── TOP BAR ── */}
      <div
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          padding: '16px 20px 12px', flexShrink: 0,
          background: 'linear-gradient(180deg,rgba(0,0,0,.5) 0%,transparent 100%)',
        }}
      >
        {/* Left: Project, Concept, status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', fontWeight: 500, letterSpacing: '.04em' }}>{meta.projectName}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: T.fH, fontSize: 18, fontWeight: 500, color: T.n0, lineHeight: 1.2 }}>{meta.conceptName}</span>
            {!isAdmin && decision && (
              <span
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  border: decision === 'approved' ? `1.5px solid ${T.forest600}` : `1.5px solid ${T.ruby500}`,
                  background: decision === 'approved' ? T.forest600 : 'transparent',
                  color: decision === 'approved' ? T.n0 : T.ruby500,
                }}
              >
                {decision === 'approved' && Ic.check}
                {decision === 'approved' ? 'Approved' : 'Changes requested'}
              </span>
            )}
          </div>
        </div>

        {/* Right: Phase info + Close */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexShrink: 0 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: T.gold400, fontWeight: 600, fontFamily: T.fM, letterSpacing: '.05em' }}>{meta.phase}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', marginTop: 2 }}>{meta.phaseName}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginTop: 1, fontFamily: T.fM }}>{meta.taskItem}</div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,.08)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,.7)', transition: 'all .15s ease', flexShrink: 0 }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,.18)'; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,.08)'; e.currentTarget.style.color = 'rgba(255,255,255,.7)' }}
            aria-label="Close"
          >
            {Ic.x}
          </button>
        </div>
      </div>

      {/* ── IMAGE STAGE ── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', minHeight: 0 }}>
        {/* Prev peek */}
        {total > 1 && (
          <div
            onClick={prev}
            style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: 'clamp(40px,10vw,120px)', height: '60%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2 }}
          >
            <img src={mockups[prevIdx].url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '0 8px 8px 0', opacity: 0.18, filter: 'blur(1px)', transition: 'opacity .2s ease', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div
                style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)', transition: 'background .15s ease' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,.25)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,.1)')}
              >
                {Ic.chevL}
              </div>
            </div>
          </div>
        )}

        {/* Main image */}
        <div
          style={{
            transform: getTransform(),
            opacity: animating ? 0 : 1,
            transition: animating
              ? 'transform .28s cubic-bezier(.4,0,.2,1), opacity .15s ease'
              : 'transform .28s cubic-bezier(.4,0,.2,1), opacity .2s ease .05s',
            maxWidth: 'calc(100% - clamp(80px,20vw,240px))',
            maxHeight: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 0',
          }}
        >
          <img
            key={idx}
            src={mockups[idx].url}
            alt={mockups[idx].label}
            onLoad={() => onImgLoad(idx)}
            style={{
              maxWidth: '100%', maxHeight: 'calc(100vh - 200px)',
              objectFit: 'contain', borderRadius: T.r.md,
              opacity: loaded[idx] ? 1 : 0, transition: 'opacity .25s ease',
              boxShadow: '0 8px 32px rgba(0,0,0,.4)',
            }}
          />
        </div>

        {/* Next peek */}
        {total > 1 && (
          <div
            onClick={next}
            style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', width: 'clamp(40px,10vw,120px)', height: '60%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2 }}
          >
            <img src={mockups[nextIdx].url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px 0 0 8px', opacity: 0.18, filter: 'blur(1px)', transition: 'opacity .2s ease', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div
                style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)', transition: 'background .15s ease' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,.25)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,.1)')}
              >
                {Ic.chevR}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── FOOTER ROW 1: Thumbnail strip ── */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '8px 20px', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '4px 0', maxWidth: '80vw', scrollbarWidth: 'none' }}>
          {mockups.map((m, i) => (
            <button
              key={m.id}
              onClick={() => {
                if (!animating) {
                  setDir(i > idx ? 1 : -1)
                  setAnimating(true)
                  setTimeout(() => {
                    setIdx(i)
                    setAnimating(false)
                  }, 180)
                }
              }}
              style={{
                width: 40, height: 30, borderRadius: 4, overflow: 'hidden',
                border: i === idx ? `2px solid ${T.gold400}` : '2px solid transparent',
                opacity: i === idx ? 1 : 0.5, cursor: 'pointer', flexShrink: 0, padding: 0, background: T.n800,
                transition: 'all .2s ease',
              }}
            >
              <img src={m.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </button>
          ))}
        </div>
      </div>

      {/* ── FOOTER ROW 2: Brand + Counter ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 20px 14px', flexShrink: 0, borderTop: '1px solid rgba(255,255,255,.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: T.teal500, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: T.n0 }}>e</div>
          <span style={{ fontFamily: T.fH, fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,.5)', letterSpacing: '-.01em' }}>eswar creatives</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: 'rgba(255,255,255,.4)', fontFamily: T.fM }}>
          <span>{fmtDate(meta.date)}</span>
          <span style={{ color: T.gold400, fontWeight: 600 }}>{String(idx + 1).padStart(2, '0')}</span>
          <span>/</span>
          <span>{String(total).padStart(2, '0')}</span>
        </div>
      </div>

      {/* ── FEEDBACK PANEL (client view only) ── */}
      {!isAdmin && (
        <div style={fb.panel}>
          {fbError && <div style={fb.error}>{fbError}</div>}

          {/* Per-image comment */}
          <div style={fb.block}>
            <label style={fb.label} htmlFor="mockup-comment">
              Leave a comment on this mockup
            </label>
            <div style={fb.commentRow}>
              <textarea
                id="mockup-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={mockups[idx]?.label ? `Comment on "${mockups[idx].label}"` : 'Your comment'}
                style={fb.textarea}
              />
              <button
                type="button"
                onClick={submitComment}
                disabled={itemSaving || !comment.trim()}
                style={{ ...fb.btnSolid, ...(itemSaving || !comment.trim() ? fb.btnDisabled : null) }}
              >
                {itemSaving ? 'Sending...' : 'Submit'}
              </button>
            </div>
            {itemSavedFor === mockups[idx]?.id && <span style={fb.savedFlash}>Comment added</span>}
          </div>

          {/* Concept decision */}
          <div style={fb.block}>
            {decision ? (
              <div style={fb.submitted}>
                {Ic.check}
                Feedback submitted
              </div>
            ) : (
              <>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a note for the whole concept (optional)"
                  style={fb.noteInput}
                />
                <div style={fb.decisionRow}>
                  <button
                    type="button"
                    onClick={() => submitDecision('approved')}
                    disabled={decisionSaving}
                    style={{ ...fb.approveBtn, ...(decisionSaving ? fb.btnDisabled : null) }}
                  >
                    {Ic.check} Approve Concept
                  </button>
                  <button
                    type="button"
                    onClick={() => submitDecision('changes')}
                    disabled={decisionSaving}
                    style={{ ...fb.changesBtn, ...(decisionSaving ? fb.btnDisabled : null) }}
                  >
                    Request Changes
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Feedback panel styling — tuned to the dark lightbox surface.
const fb: Record<string, CSSProperties> = {
  panel: {
    flexShrink: 0,
    borderTop: '1px solid rgba(255,255,255,.10)',
    background: 'rgba(0,0,0,.35)',
    padding: '14px 20px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    maxWidth: 760,
    width: '100%',
    margin: '0 auto',
    boxSizing: 'border-box',
  },
  error: {
    background: T.ruby50,
    color: T.ruby500,
    borderRadius: T.r.sm,
    padding: '8px 12px',
    fontSize: 12,
    fontFamily: T.fB,
  },
  block: { display: 'flex', flexDirection: 'column', gap: 8 },
  label: { fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.7)', fontFamily: T.fB },
  commentRow: { display: 'flex', gap: 8, alignItems: 'flex-start' },
  textarea: {
    flex: 1,
    minHeight: 40,
    resize: 'vertical',
    padding: '8px 10px',
    fontSize: 13,
    fontFamily: T.fB,
    color: T.n0,
    background: 'rgba(255,255,255,.06)',
    border: '1px solid rgba(255,255,255,.15)',
    borderRadius: T.r.sm,
    outline: 'none',
    boxSizing: 'border-box',
  },
  btnSolid: {
    flexShrink: 0,
    padding: '8px 16px',
    background: T.teal400,
    color: T.n0,
    border: 'none',
    borderRadius: T.r.md,
    fontSize: 13,
    fontFamily: T.fB,
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnDisabled: { opacity: 0.5, cursor: 'default' },
  savedFlash: { fontSize: 12, color: T.gold400, fontFamily: T.fB },
  noteInput: {
    padding: '8px 10px',
    fontSize: 13,
    fontFamily: T.fB,
    color: T.n0,
    background: 'rgba(255,255,255,.06)',
    border: '1px solid rgba(255,255,255,.15)',
    borderRadius: T.r.sm,
    outline: 'none',
    boxSizing: 'border-box',
  },
  decisionRow: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  approveBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '9px 18px',
    background: T.forest600,
    color: T.n0,
    border: 'none',
    borderRadius: T.r.md,
    fontSize: 13,
    fontFamily: T.fB,
    fontWeight: 600,
    cursor: 'pointer',
  },
  changesBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '9px 18px',
    background: 'transparent',
    color: T.ruby500,
    border: `1.5px solid ${T.ruby500}`,
    borderRadius: T.r.md,
    fontSize: 13,
    fontFamily: T.fB,
    fontWeight: 600,
    cursor: 'pointer',
  },
  submitted: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    color: T.forest600,
    background: T.forest50,
    padding: '9px 16px',
    borderRadius: T.r.md,
    fontSize: 13,
    fontFamily: T.fB,
    fontWeight: 600,
    alignSelf: 'flex-start',
  },
}
