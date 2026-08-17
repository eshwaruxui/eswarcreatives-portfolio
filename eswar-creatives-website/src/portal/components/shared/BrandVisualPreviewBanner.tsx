// Persistent "Previewing as X · Exit preview" banner. Used from both the
// admin Brand Visual Guide tab and the real client route — a preview is
// always entered from a real session, this banner is what makes it
// unmistakable the viewer is looking at someone else's view, not their own.
import { Eye } from 'lucide-react'
import type { CSSProperties } from 'react'
import { t, fonts } from '../../theme'

export function BrandVisualPreviewBanner({ label, onExit }: { label: 'client' | 'public'; onExit: () => void }) {
  return (
    <div style={s.banner}>
      <span style={s.label}>
        <Eye size={15} /> Previewing as {label === 'client' ? 'Client' : 'Public'}
      </span>
      <button type="button" style={s.exitBtn} onClick={onExit}>
        Exit preview
      </button>
    </div>
  )
}

const s: Record<string, CSSProperties> = {
  banner: {
    position: 'sticky',
    top: 0,
    zIndex: 80,
    background: t.text.primary,
    color: t.text.inverse,
    padding: '12px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    fontFamily: fonts.body,
  },
  label: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 600 },
  exitBtn: {
    background: t.background.overlayLightStrong,
    color: t.text.inverse,
    border: 'none',
    borderRadius: 8,
    padding: '7px 14px',
    fontSize: 12.5,
    fontWeight: 600,
    cursor: 'pointer',
  },
}
