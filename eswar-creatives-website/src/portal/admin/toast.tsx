// Lightweight admin toast. A module-level store holds the current toast so any
// caller (e.g. AddClientModal, used from both the TopBar and the Clients list)
// can raise one without prop-drilling, and a single <ToastHost> mounted in the
// AdminShell renders it top-right with enter/exit motion and auto-dismiss.
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { CSSProperties } from 'react'
import { tokens, t, fonts, motionTokens } from '../theme'

export type ToastVariant = 'success' | 'error'
type ToastData = { id: number; message: string; variant: ToastVariant }

let current: ToastData | null = null
let seq = 0
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

export function showToast(message: string, variant: ToastVariant) {
  current = { id: ++seq, message, variant }
  emit()
}

function clearToast() {
  current = null
  emit()
}

function subscribeToast(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getToast(): ToastData | null {
  return current
}

export function ToastHost() {
  const toast = useSyncExternalStore(subscribeToast, getToast, getToast)
  const [phase, setPhase] = useState<'enter' | 'exit'>('enter')
  const lastId = useRef<number | null>(null)

  useEffect(() => {
    if (!toast || toast.id === lastId.current) return
    lastId.current = toast.id
    setPhase('enter')
    const tExit = setTimeout(() => setPhase('exit'), 4000)
    const tClear = setTimeout(() => clearToast(), 4200)
    return () => {
      clearTimeout(tExit)
      clearTimeout(tClear)
    }
  }, [toast])

  if (!toast) return null

  const palette =
    toast.variant === 'success'
      ? { background: tokens.green, color: tokens.surface }
      : { background: tokens.ruby, color: tokens.surface }

  return (
    <>
      <style>{`
        @keyframes adminToastIn{from{opacity:0;transform:translateY(-16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes adminToastOut{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(-16px)}}
      `}</style>
      <div
        role="status"
        aria-live="polite"
        style={{
          ...styles.toast,
          ...palette,
          animation:
            phase === 'enter'
              ? `adminToastIn ${motionTokens.durationBase} ${motionTokens.easeEnter}`
              : `adminToastOut ${motionTokens.durationFast} ${motionTokens.easeExit} forwards`,
        }}
      >
        {toast.message}
      </div>
    </>
  )
}

const styles: Record<string, CSSProperties> = {
  toast: {
    position: 'fixed',
    top: 16,
    right: 16,
    zIndex: 400,
    maxWidth: 360,
    padding: '12px 16px',
    borderRadius: 10,
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    boxShadow: '0 12px 32px rgba(2, 76, 79, 0.18)',
  },
}
