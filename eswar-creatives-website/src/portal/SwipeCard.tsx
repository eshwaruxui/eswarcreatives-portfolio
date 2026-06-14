import { useState } from 'react'
import { motion, useMotionValue, useTransform, type PanInfo } from 'motion/react'
import { tokens } from './theme'

// Shared swipeable sketch card, used by both the client review flow
// (SketchReviewPage) and the public voting flow (PublicVotePage). Extracted so
// the swipe + commit interaction lives in exactly one place.
// Right swipe / drag past threshold -> onDecide(true)  (accept, green check).
// Left swipe  / drag past threshold -> onDecide(false) (reject, red X).

export const SWIPE_THRESHOLD = 120 // px of horizontal travel that commits a decision

export function SwipeCard({
  sketch,
  position,
  total,
  onDecide,
}: {
  sketch: { url: string }
  position: number
  total: number
  onDecide: (accepted: boolean) => void
}) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-12, 12])
  const acceptOpacity = useTransform(x, [40, 140], [0, 1])
  const rejectOpacity = useTransform(x, [-140, -40], [1, 0])
  // Once a swipe crosses the threshold we lock the direction: the overlay icon
  // sticks, drag is disabled (no spring back), and the card flies off-screen.
  const [committed, setCommitted] = useState<0 | 1 | -1>(0)
  const screenW = typeof window !== 'undefined' ? window.innerWidth : 1000

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (committed !== 0) return
    const goRight = info.offset.x > SWIPE_THRESHOLD || info.velocity.x > 600
    const goLeft = info.offset.x < -SWIPE_THRESHOLD || info.velocity.x < -600
    if (!goRight && !goLeft) return // under threshold: drag springs back
    const dir = goRight ? 1 : -1
    setCommitted(dir)
    onDecide(dir === 1)
  }

  const acceptOp = committed === 1 ? 1 : committed === -1 ? 0 : acceptOpacity
  const rejectOp = committed === -1 ? 1 : committed === 1 ? 0 : rejectOpacity

  return (
    <motion.div
      style={{ ...cardStyles.card, x, rotate }}
      drag={committed === 0 ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.6}
      onDragEnd={handleDragEnd}
      initial={{ scale: 0.96, opacity: 0, y: 8 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={(dir: number) => ({
        x: dir * (screenW + 240),
        opacity: 0,
        transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] },
      })}
      whileTap={{ cursor: 'grabbing' }}
    >
      <motion.div style={{ ...cardStyles.iconOverlay, opacity: acceptOp }}>
        <div style={{ ...cardStyles.iconCircle, background: tokens.green }}>
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke={tokens.surface}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
      </motion.div>
      <motion.div style={{ ...cardStyles.iconOverlay, opacity: rejectOp }}>
        <div style={{ ...cardStyles.iconCircle, background: tokens.ruby }}>
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke={tokens.surface}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </div>
      </motion.div>

      <img
        src={sketch.url}
        alt={`Logo sketch ${position} of ${total}`}
        style={cardStyles.image}
        draggable={false}
      />
      <div style={cardStyles.cardFoot}>
        <span style={cardStyles.cardFootText}>
          Sketch {position} of {total}
        </span>
      </div>
    </motion.div>
  )
}

// Card styles. `image` is also used for the back card in the deck wrappers, so
// it is exported for reuse rather than duplicated.
export const cardStyles: Record<string, React.CSSProperties> = {
  card: {
    position: 'absolute',
    inset: 0,
    background: tokens.surface,
    border: `1px solid ${tokens.border}`,
    borderRadius: 20,
    overflow: 'hidden',
    boxShadow: '0 12px 32px rgba(2, 76, 79, 0.12)',
    cursor: 'grab',
    display: 'flex',
    flexDirection: 'column',
    touchAction: 'pan-y',
  },
  image: {
    width: '100%',
    flex: 1,
    minHeight: 0,
    objectFit: 'contain',
    background: tokens.bg,
    userSelect: 'none',
    pointerEvents: 'none',
  },
  cardFoot: {
    padding: '12px 16px',
    borderTop: `1px solid ${tokens.border}`,
    background: tokens.surface,
  },
  cardFootText: { fontSize: 13, color: tokens.textMuted, fontWeight: 500 },
  iconOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    pointerEvents: 'none',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
}
