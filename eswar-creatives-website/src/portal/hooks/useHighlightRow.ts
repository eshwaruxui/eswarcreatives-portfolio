import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { tokens } from '../theme'

// Briefly highlights a just-added row in a list -- a gold flash that fades
// back out over 0.6s -- then clears itself automatically. Extracted from
// three independent, near-identical copies (ClientsList, ProjectsList,
// ProposalsAdmin), each hand-rolling the same highlightId state + timeout
// ref + cleanup-on-unmount effect. Consolidated here so a new list reuses
// this instead of writing a fourth copy, and so the gold token / 2500ms /
// 0.6s timing can't drift between consumers.
const HIGHLIGHT_MS = 2500

export function useHighlightRow() {
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  function triggerHighlight(id: string) {
    setHighlightId(id)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setHighlightId(null), HIGHLIGHT_MS)
  }

  return { highlightId, triggerHighlight }
}

// Two style variants, matching the two treatments already in use across the
// three original consumers: a full row/card background (ProjectsList), and
// a left border accent (ClientsList's first cell, ProposalsAdmin's cards --
// ClientsList uses both at once). Each always carries its own `transition`
// property regardless of `active`, so the fade-out plays correctly whether
// the caller spreads this once per render or conditionally -- a property
// that doesn't exist on the "before" style can't transition in from nothing.
export function highlightBackgroundStyle(active: boolean): CSSProperties {
  return {
    transition: 'background-color 0.6s ease',
    ...(active ? { background: tokens.goldLight } : {}),
  }
}

export function highlightBorderStyle(active: boolean): CSSProperties {
  return {
    borderLeftWidth: 3,
    borderLeftStyle: 'solid',
    borderLeftColor: active ? tokens.gold : 'transparent',
    transition: 'border-left-color 0.6s ease',
  }
}
